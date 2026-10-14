use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::Arc;
use std::thread::JoinHandle;
use std::time::Duration;

use rustls::pki_types::PrivateKeyDer;
use rustls::{ServerConfig, ServerConnection};

const VECTORS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/vectors/tls.json"));
const CREDENTIAL_MARKS: [&str; 4] = ["authorization:", "cookie:", "x-argus-device-credential:", "bearer "];
const SILENCE: Duration = Duration::from_millis(900);
const SERVER_WAIT: Duration = Duration::from_secs(3);
const DRAIN_WAIT: Duration = Duration::from_millis(300);

pub struct Identity {
  pub cert: String,
  pub key: String,
}

pub struct Vectors {
  pub lan_host: String,
  pub home_id: String,
  pub domain: String,
  pub ca: String,
  pub home: Identity,
  pub rogue: Identity,
  pub misnamed: Identity,
}

fn text(document: &serde_json::Value, key: &str) -> String {
  document[key].as_str().expect("a string field").to_string()
}

fn identity(document: &serde_json::Value, key: &str) -> Identity {
  Identity {
    cert: text(&document[key], "cert"),
    key: text(&document[key], "key"),
  }
}

impl Vectors {
  pub fn load() -> Self {
    let document: serde_json::Value = serde_json::from_str(VECTORS).expect("the TLS vectors are JSON");
    Self {
      lan_host: text(&document, "lanHost"),
      home_id: text(&document, "homeId"),
      domain: text(&document, "domain"),
      ca: text(&document, "ca"),
      home: identity(&document, "home"),
      rogue: identity(&document, "rogue"),
      misnamed: identity(&document, "misnamed"),
    }
  }
}

pub fn pem_fingerprint(pem: &str) -> String {
  let der = rustls_pemfile::certs(&mut pem.as_bytes())
    .next()
    .expect("a certificate")
    .expect("a readable certificate");
  super::probe::fingerprint(der.as_ref())
}

pub fn credential_free(request: &[u8]) -> bool {
  let lowered = String::from_utf8_lossy(request).to_lowercase();
  CREDENTIAL_MARKS.iter().all(|mark| !lowered.contains(mark))
}

#[derive(Clone, Copy)]
pub enum Behaviour {
  Answer,
  Close,
  Silent,
}

#[derive(Default)]
pub struct Seen {
  pub raw: Vec<u8>,
  pub plaintext: Vec<u8>,
}

pub struct Server {
  pub port: u16,
  handle: JoinHandle<Seen>,
}

impl Server {
  pub fn finish(self) -> Seen {
    self.handle.join().expect("the test server ends")
  }
}

struct Tap<'a> {
  inner: &'a mut TcpStream,
  raw: Vec<u8>,
}

impl Read for Tap<'_> {
  fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
    let read = self.inner.read(buffer)?;
    self.raw.extend_from_slice(&buffer[..read]);
    Ok(read)
  }
}

impl Write for Tap<'_> {
  fn write(&mut self, buffer: &[u8]) -> std::io::Result<usize> {
    self.inner.write(buffer)
  }

  fn flush(&mut self) -> std::io::Result<()> {
    self.inner.flush()
  }
}

fn server_config(identity: &Identity) -> Arc<ServerConfig> {
  let chain = rustls_pemfile::certs(&mut identity.cert.as_bytes())
    .collect::<Result<Vec<_>, _>>()
    .expect("a certificate chain");
  let key: PrivateKeyDer<'static> = rustls_pemfile::private_key(&mut identity.key.as_bytes())
    .expect("a readable key")
    .expect("a private key");
  Arc::new(
    ServerConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
      .with_safe_default_protocol_versions()
      .expect("a protocol set")
      .with_no_client_auth()
      .with_single_cert(chain, key)
      .expect("a server configuration"),
  )
}

fn drain(tap: &mut Tap<'_>) {
  let _ = tap.inner.set_read_timeout(Some(DRAIN_WAIT));
  let mut chunk = [0u8; 1024];
  while matches!(tap.read(&mut chunk), Ok(read) if read > 0) {}
}

fn request_of(stream: &mut impl Read) -> Vec<u8> {
  let mut request = Vec::new();
  let mut chunk = [0u8; 1024];
  while !request.windows(4).any(|window| window == b"\r\n\r\n") {
    match stream.read(&mut chunk) {
      Ok(0) | Err(_) => break,
      Ok(read) => request.extend_from_slice(&chunk[..read]),
    }
  }
  request
}

fn answer(socket: &mut TcpStream, config: Arc<ServerConfig>) -> Seen {
  let _ = socket.set_read_timeout(Some(SERVER_WAIT));
  let mut tap = Tap { inner: socket, raw: Vec::new() };
  let Ok(mut connection) = ServerConnection::new(config) else {
    return Seen::default();
  };
  while connection.is_handshaking() {
    if connection.complete_io(&mut tap).is_err() {
      drain(&mut tap);
      return Seen { raw: tap.raw, plaintext: Vec::new() };
    }
  }
  let plaintext = {
    let mut stream = rustls::Stream::new(&mut connection, &mut tap);
    let request = request_of(&mut stream);
    let _ = stream.write_all(b"HTTP/1.1 200 OK\r\ncontent-length: 2\r\nconnection: close\r\n\r\n{}");
    let _ = stream.flush();
    request
  };
  connection.send_close_notify();
  let _ = connection.complete_io(&mut tap);
  Seen { raw: tap.raw, plaintext }
}

pub fn serve(identity: &Identity, behaviour: Behaviour) -> Server {
  let listener = TcpListener::bind("127.0.0.1:0").expect("a free port");
  let port = listener.local_addr().expect("an address").port();
  let config = server_config(identity);
  let handle = std::thread::spawn(move || {
    let Ok((mut socket, _)) = listener.accept() else {
      return Seen::default();
    };
    match behaviour {
      Behaviour::Answer => answer(&mut socket, config),
      Behaviour::Close => Seen::default(),
      Behaviour::Silent => {
        std::thread::sleep(SILENCE);
        Seen::default()
      }
    }
  });
  Server { port, handle }
}

use rfd::{MessageButtons, MessageDialog, MessageDialogResult, MessageLevel};
use tauri::{AppHandle, Manager, Runtime};

pub struct TrustChange {
  pub previous: String,
  pub next: String,
  pub host: String,
}

struct Copy {
  title: &'static str,
  lead: &'static str,
  before: &'static str,
  after: &'static str,
  advice: &'static str,
  confirm: &'static str,
  cancel: &'static str,
}

const SPANISH: Copy = Copy {
  title: "Cambiar el servidor de Argus",
  lead: "Este equipo va a dejar de confiar en el servidor con el que estaba vinculado y pasará a confiar en otro.",
  before: "Antes",
  after: "Ahora",
  advice: "Si no acabas de vincular un servidor nuevo, cancela.",
  confirm: "Confiar en el nuevo servidor",
  cancel: "Cancelar",
};

const ENGLISH: Copy = Copy {
  title: "Change the Argus server",
  lead: "This computer is about to stop trusting the server it was paired with and trust a different one.",
  before: "Before",
  after: "Now",
  advice: "If you did not just pair a new server, cancel.",
  confirm: "Trust the new server",
  cancel: "Cancel",
};

pub fn changes_anchor(previous: Option<&str>, next: &str) -> bool {
  previous.is_some_and(|pinned| !pinned.is_empty() && !pinned.eq_ignore_ascii_case(next))
}

pub fn short_fingerprint(hex: &str) -> String {
  let clean: Vec<char> = hex.chars().filter(char::is_ascii_hexdigit).map(|c| c.to_ascii_uppercase()).collect();
  let pairs: Vec<String> = clean.chunks(2).map(|pair| pair.iter().collect()).collect();
  if pairs.len() <= 8 {
    return pairs.join(":");
  }
  format!("{} … {}", pairs[..6].join(":"), pairs[pairs.len() - 2..].join(":"))
}

pub fn spanish_locale(values: &[Option<String>]) -> bool {
  values
    .iter()
    .flatten()
    .find(|value| !value.is_empty())
    .is_some_and(|value| value.to_ascii_lowercase().starts_with("es"))
}

fn system_copy() -> &'static Copy {
  let values: Vec<Option<String>> =
    ["LC_ALL", "LC_MESSAGES", "LANG"].iter().map(|name| std::env::var(name).ok()).collect();
  if spanish_locale(&values) {
    &SPANISH
  } else {
    &ENGLISH
  }
}

fn describe(copy: &Copy, change: &TrustChange) -> String {
  format!(
    "{}\n\n{}: {}\n{}: {}  ({})\n\n{}",
    copy.lead,
    copy.before,
    short_fingerprint(&change.previous),
    copy.after,
    short_fingerprint(&change.next),
    change.host,
    copy.advice
  )
}

fn ask<R: Runtime>(app: &AppHandle<R>, change: &TrustChange) -> bool {
  let copy = system_copy();
  let mut dialog = MessageDialog::new()
    .set_level(MessageLevel::Warning)
    .set_title(copy.title)
    .set_description(describe(copy, change))
    .set_buttons(MessageButtons::OkCancelCustom(copy.confirm.to_string(), copy.cancel.to_string()));
  if let Some(window) = app.get_webview_window("main") {
    dialog = dialog.set_parent(&window);
  }
  match dialog.show() {
    MessageDialogResult::Ok | MessageDialogResult::Yes => true,
    MessageDialogResult::Custom(label) => label == copy.confirm,
    _ => false,
  }
}

pub async fn trust_change<R: Runtime>(app: AppHandle<R>, change: TrustChange) -> bool {
  tauri::async_runtime::spawn_blocking(move || ask(&app, &change)).await.unwrap_or(false)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn a_first_pairing_or_the_same_server_needs_no_confirmation() {
    assert!(!changes_anchor(None, "AB12"));
    assert!(!changes_anchor(Some(""), "AB12"));
    assert!(!changes_anchor(Some("ab12"), "AB12"));
    assert!(changes_anchor(Some("AB12"), "CD34"));
  }

  #[test]
  fn a_fingerprint_is_shortened_into_readable_pairs() {
    assert_eq!(short_fingerprint("ab12cd"), "AB:12:CD");
    let long = "00112233445566778899AABBCCDDEEFF";
    assert_eq!(short_fingerprint(long), "00:11:22:33:44:55 … EE:FF");
  }

  #[test]
  fn the_first_locale_variable_that_is_set_decides_the_language() {
    assert!(spanish_locale(&[None, None, Some("es_PE.UTF-8".into())]));
    assert!(!spanish_locale(&[Some("en_US.UTF-8".into()), None, Some("es_PE.UTF-8".into())]));
    assert!(spanish_locale(&[Some(String::new()), Some("es".into()), None]));
    assert!(!spanish_locale(&[None, None, None]));
  }

  #[test]
  fn the_dialog_names_both_servers() {
    let text = describe(
      &SPANISH,
      &TrustChange { previous: "AA".repeat(32), next: "BB".repeat(32), host: "argus.local".into() },
    );
    assert!(text.contains("Antes: AA:AA"));
    assert!(text.contains("Ahora: BB:BB"));
    assert!(text.contains("argus.local"));
  }
}

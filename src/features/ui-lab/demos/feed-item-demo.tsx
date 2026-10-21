import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Feed, FeedItem } from '@/shared/ui/feed-item';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function FeedItemDemo() {
  return (
    <>
      <LabCase id="feed" block>
        <Feed>
          <FeedItem
            leading={<Avatar icon="user" tone="accent" round />}
            who={copy.carlos}
            when={copy.carlosWhen}
            text={copy.carlosText}
            unreadLabel={copy.unread}
            actions={
              <>
                <Button compact variant="primary" label={copy.activate} onPress={noop} />
                <Button compact label={copy.notNow} onPress={noop} />
              </>
            }
          />
          <FeedItem
            leading={<Avatar icon="cam" round />}
            who={copy.kitchen}
            when={copy.kitchenWhen}
            text={copy.kitchenText}
          />
          <FeedItem
            leading={<Avatar icon="bell" round />}
            who={copy.reminder}
            when={copy.reminderWhen}
            text={copy.reminderText}
          />
        </Feed>
      </LabCase>
      <LabCase id="long" block>
        <Feed>
          <FeedItem
            leading={<Avatar icon="user" tone="accent" round />}
            who={copy.maria}
            when={copy.carlosWhen}
            text={copy.mariaText}
            actions={
              <>
                <Button compact variant="primary" label={copy.activate} onPress={noop} />
                <Button compact label={copy.notNow} onPress={noop} />
              </>
            }
          />
        </Feed>
      </LabCase>
      <LabCase id="thread" block>
        <Feed>
          <FeedItem
            leading={<Avatar icon="alert" tone="attn" round />}
            who={copy.patio}
            when={copy.patioWhen}
            text={copy.patioText}
            thread
            actions={<Button compact label={copy.review} onPress={noop} />}
          />
          <FeedItem
            leading={<Avatar initial="L" round />}
            who={copy.luisName}
            when={copy.luisWhen}
            text={copy.luisReply}
          />
        </Feed>
      </LabCase>
    </>
  );
}

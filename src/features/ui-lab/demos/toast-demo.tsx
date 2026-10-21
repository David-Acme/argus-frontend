import { Button } from '@/shared/ui/button';
import { Inline } from '@/shared/ui/layout';
import { toast, ToastCard, Toaster } from '@/shared/ui/toast';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function ToastDemo() {
  return (
    <>
      <LabCase id="undo" block>
        <ToastCard kind="undo" title={copy.taskDone} onAction={noop} />
      </LabCase>
      <LabCase id="error" block>
        <ToastCard
          kind="error"
          title={copy.notSaved}
          body={copy.checkConnection}
          icon="wifioff"
          onAction={noop}
        />
      </LabCase>
      <LabCase id="success" block>
        <ToastCard kind="success" title={copy.savedReminder} />
      </LabCase>
      <LabCase id="info" block>
        <ToastCard kind="info" title={copy.willRemind} />
      </LabCase>
      <LabCase id="live">
        <Toaster />
        <Inline>
          <Button
            compact
            label={copy.showUndo}
            onPress={() => {
              toast.show({ kind: 'undo', title: copy.taskDone, onUndo: noop });
            }}
          />
          <Button
            compact
            label={copy.showError}
            onPress={() => {
              toast.show({
                kind: 'error',
                title: copy.notSaved,
                body: copy.checkConnection,
                icon: 'wifioff',
                onRetry: noop,
              });
            }}
          />
        </Inline>
      </LabCase>
    </>
  );
}

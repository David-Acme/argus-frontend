import { QrScanSheet, type QrScanSheetProps } from '@/features/qr/components/qr-scan-sheet';
import { ScrollView, View } from 'react-native';

type QrScanPanelProps = QrScanSheetProps & {
  width: number;
  topInset: number;
  bottomInset: number;
};

function QrScanPanel({ width, topInset, bottomInset, ...sheetProps }: QrScanPanelProps) {
  return (
    <View
      className="bg-card border-border shrink-0 border-l"
      style={{ width, paddingTop: topInset, paddingBottom: bottomInset }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <QrScanSheet {...sheetProps} variant="supporting-pane" />
      </ScrollView>
    </View>
  );
}

export { QrScanPanel };
export type { QrScanPanelProps };

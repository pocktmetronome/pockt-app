import { ReelScreen } from '@/components/selectors/ReelScreen';
import { POCKET_STEPS, type PocketStepId } from '@/constants/feel';

type Props = {
  visible: boolean;
  value: PocketStepId;
  onChange: (value: PocketStepId) => void;
  onSettled?: (value: PocketStepId) => void;
  onClose: () => void;
};

export function FeelReelScreen({ visible, value, onChange, onSettled, onClose }: Props) {
  const current = POCKET_STEPS.find((step) => step.id === value) ?? POCKET_STEPS[2]!;
  return (
    <ReelScreen
      visible={visible}
      title="FEEL"
      value={value}
      caption={current.label === 'STRAIGHT' ? 'Exact grid.' : current.label}
      options={POCKET_STEPS.map((step) => ({ id: step.id, label: step.label }))}
      onChange={onChange}
      onSettled={onSettled}
      onClose={onClose}
    />
  );
}

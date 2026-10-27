import { Redirect, useLocalSearchParams } from 'expo-router';
import { CLIPS_HREF } from '@/features/cameras/constants/routes.constant';

export default function CameraRecordingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: CLIPS_HREF, params: { camera: id } }} />;
}

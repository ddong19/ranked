import { useRouter } from 'expo-router';
import RankingForm from '../components/RankingForm';

export default function AddRankingScreen() {
  const router = useRouter();

  const handleSave = async () => {
    // TODO: Implement save logic
    console.log('Save clicked');
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <RankingForm
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
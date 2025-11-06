import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import SwipeableItem from '../components/SwipeableItem';

interface RankingCardProps {
  ranking: {
    id: number;
    title: string;
    description?: string | null;
    itemCount: number;
  };
  onPress: () => void;
  onDelete: () => void;
}

export default function RankingCard({ ranking, onPress, onDelete }: RankingCardProps) {
  return (
    <View style={styles.cardWrapper}>
      <SwipeableItem onDelete={onDelete} onPress={onPress}>
        <View style={styles.rankingCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>{ranking.title}</Text>
              {ranking.description && (
                <Text style={styles.cardDescription}>
                  {ranking.description}
                </Text>
              )}
              <Text style={styles.itemCount}>
                {ranking.itemCount} {ranking.itemCount === 1 ? 'Item' : 'Items'}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </View>
        </View>
      </SwipeableItem>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 4, // 4 + 12 from SwipeableItem = 16 total
  },
  rankingCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  cardLeft: {
    flex: 1,
    marginRight: 16,
  },
  cardRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  itemCount: {
    color: '#666',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

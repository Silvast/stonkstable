import { useStockSelection } from '../../context/StockSelectionContext';
import SegmentedControl from '../common/SegmentedControl';

const EXCHANGES = ['US', 'HE', 'LSE'] as const;

const ExchangeToggle = () => {
  const { exchange, setExchange } = useStockSelection();

  return <SegmentedControl label="Exchange" options={EXCHANGES} value={exchange} onChange={setExchange} />;
};

export default ExchangeToggle;

import React from 'react';
import { Segmented } from '@/app/components/ui/compat';

const TimeRangeSelector: React.FC = () => (
  <Segmented<string>
    options={['0', '1', '2', '3', '4']}
    onChange={(value) => {
      console.log(value); // string
    }}
  />
);

export default TimeRangeSelector;


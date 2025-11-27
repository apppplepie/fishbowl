import React from 'react';
import { Segmented } from 'antd';

const TimeRangeSelector: React.FC = () => (
  <Segmented<string>
    options={['0', '1', '2', '3', '4']}
    onChange={(value) => {
      console.log(value); // string
    }}
  />
);

export default TimeRangeSelector;


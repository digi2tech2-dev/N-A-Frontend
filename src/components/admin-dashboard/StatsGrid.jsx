import React from 'react';
import StatCard from './StatCard';
import './AdminNeonGlow.css';

const StatsGrid = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="mx-auto grid w-[calc(100vw-1.5rem)] max-w-[42rem] grid-cols-2 justify-items-center gap-3 sm:w-full sm:gap-4 xl:max-w-none xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={`stats-skeleton-${index}`}
            className="admin-dashboard-skeleton h-[110px] w-full max-w-[24rem] animate-pulse rounded-[1rem] sm:max-w-none sm:h-[148px]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-[calc(100vw-1.5rem)] max-w-[42rem] grid-cols-2 justify-items-center gap-3 sm:w-full sm:gap-4 xl:max-w-none xl:grid-cols-5">
      {stats.map((stat) => (
        <StatCard key={stat.id || stat.title} {...stat} />
      ))}
    </div>
  );
};

export default StatsGrid;

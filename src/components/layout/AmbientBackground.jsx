import React from 'react';

const particles = [
  { left: '8%', top: '12%', size: '0.5rem', delay: '0s', duration: '14s' },
  { left: '18%', top: '62%', size: '0.32rem', delay: '-4s', duration: '18s' },
  { left: '32%', top: '22%', size: '0.42rem', delay: '-1.6s', duration: '16s' },
  { left: '46%', top: '74%', size: '0.36rem', delay: '-6s', duration: '20s' },
  { left: '58%', top: '18%', size: '0.55rem', delay: '-3s', duration: '17s' },
  { left: '68%', top: '54%', size: '0.28rem', delay: '-7.5s', duration: '22s' },
  { left: '81%', top: '26%', size: '0.4rem', delay: '-2.7s', duration: '19s' },
  { left: '88%', top: '72%', size: '0.34rem', delay: '-5.3s', duration: '15s' },
];

const AmbientBackground = () => (
  <div className="ambient-background" aria-hidden="true">
    <div className="ambient-background__veil" />
    <div className="ambient-background__mesh" />
    <div className="ambient-background__glow ambient-background__glow--left" />
    <div className="ambient-background__glow ambient-background__glow--right" />
    <div className="ambient-background__glow ambient-background__glow--bottom" />
    {particles.map((particle, index) => (
      <span
        key={`ambient-particle-${index + 1}`}
        className="ambient-background__particle"
        style={{
          left: particle.left,
          top: particle.top,
          width: particle.size,
          height: particle.size,
          animationDelay: particle.delay,
          animationDuration: particle.duration,
        }}
      />
    ))}
  </div>
);

export default AmbientBackground;

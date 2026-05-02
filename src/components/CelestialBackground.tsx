import React, { useMemo } from 'react';

export const StarBackground = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`,
      duration: `${Math.random() * 3 + 2}s`
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {stars.map(star => (
        <div 
          key={star.id} 
          className="star" 
          style={{ 
            left: star.left, 
            top: star.top, 
            width: star.size, 
            height: star.size,
            '--duration': star.duration
          } as React.CSSProperties} 
        />
      ))}
      <div className="falling-star" style={{ top: '10%', left: '90%' }} />
      <div className="falling-star" style={{ top: '40%', left: '80%', animationDelay: '2s' }} />
    </div>
  );
};

export const FallingStars = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="falling-star" style={{ top: '5%', left: '95%', animationDelay: '0s' }} />
      <div className="falling-star" style={{ top: '15%', left: '85%', animationDelay: '3s' }} />
      <div className="falling-star" style={{ top: '50%', left: '75%', animationDelay: '6s' }} />
    </div>
  );
};

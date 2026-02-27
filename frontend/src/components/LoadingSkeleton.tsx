import React from 'react';
import './LoadingSkeleton.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className = ''
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="profile-skeleton">
      <Skeleton width="120px" height="120px" borderRadius="50%" />
      <div className="profile-skeleton-info">
        <Skeleton width="200px" height="24px" />
        <Skeleton width="150px" height="18px" />
        <Skeleton width="100%" height="60px" />
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="card-skeleton">
      <Skeleton width="100%" height="200px" />
      <div className="card-skeleton-content">
        <Skeleton width="80%" height="20px" />
        <Skeleton width="60%" height="16px" />
        <Skeleton width="100%" height="40px" />
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="list-skeleton">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="list-skeleton-item">
          <Skeleton width="50px" height="50px" borderRadius="50%" />
          <div className="list-skeleton-text">
            <Skeleton width="150px" height="18px" />
            <Skeleton width="100px" height="14px" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const GigSkeleton: React.FC = () => {
  return (
    <div className="gig-skeleton">
      <Skeleton width="100%" height="24px" />
      <Skeleton width="80%" height="16px" />
      <div className="gig-skeleton-tags">
        <Skeleton width="80px" height="28px" borderRadius="14px" />
        <Skeleton width="100px" height="28px" borderRadius="14px" />
        <Skeleton width="90px" height="28px" borderRadius="14px" />
      </div>
      <Skeleton width="100%" height="80px" />
    </div>
  );
};

export const ChatSkeleton: React.FC = () => {
  return (
    <div className="chat-skeleton">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`chat-skeleton-message ${i % 2 === 0 ? 'right' : 'left'}`}>
          <Skeleton width="60%" height="50px" borderRadius="12px" />
        </div>
      ))}
    </div>
  );
};

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = '#00ff88'
}) => {
  const sizeMap = {
    small: '24px',
    medium: '40px',
    large: '60px'
  };

  return (
    <div className="loading-spinner-container">
      <div
        className="loading-spinner"
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          borderColor: `${color}33`,
          borderTopColor: color
        }}
      />
    </div>
  );
};

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="page-loader">
      <LoadingSpinner size="large" />
      <p className="page-loader-message">{message}</p>
    </div>
  );
};

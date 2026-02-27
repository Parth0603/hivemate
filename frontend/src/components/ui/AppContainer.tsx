import type { ReactNode } from 'react';
import './UIPrimitives.css';

interface AppContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'lg';
}

const AppContainer = ({ children, className = '', size = 'lg' }: AppContainerProps) => {
  return <div className={`ui-app-container size-${size} ${className}`.trim()}>{children}</div>;
};

export default AppContainer;

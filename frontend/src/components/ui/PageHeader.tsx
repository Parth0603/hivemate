import type { ReactNode } from 'react';
import './UIPrimitives.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
}

const PageHeader = ({ title, subtitle, leftSlot, rightSlot, className = '' }: PageHeaderProps) => {
  return (
    <div className={`ui-page-header ${className}`.trim()}>
      <div className="ui-page-header-left">
        {leftSlot}
        <div className="ui-page-header-main">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {rightSlot}
    </div>
  );
};

export default PageHeader;

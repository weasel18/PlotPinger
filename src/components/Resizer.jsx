import React, { useRef } from 'react';

function Resizer({ onResize }) {
  const isDragging = useRef(false);
  const startY = useRef(0);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    startY.current = e.clientY;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;

      const deltaY = e.clientY - startY.current;
      const deltaPercent = (deltaY / window.innerHeight) * 100;
      onResize(deltaPercent);
      startY.current = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="resizer"
      onMouseDown={handleMouseDown}
    />
  );
}

export default Resizer;

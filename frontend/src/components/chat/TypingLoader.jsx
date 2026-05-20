import React from 'react';
import { motion } from 'framer-motion';

const TypingLoader = ({ size = 8, color = '#2563EB' }) => {
  const dotStyle = {
    width: size,
    height: size,
    borderRadius: '9999px',
    backgroundColor: color,
    display: 'inline-block'
  };

  const bounce = {
    animate: {
      y: [0, -6, 0],
      opacity: [0.7, 1, 0.7]
    }
  };

  return (
    <div className="flex items-center">
      <motion.span style={dotStyle} variants={bounce} animate="animate" transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
      <motion.span style={{ ...dotStyle, marginLeft: 6 }} variants={bounce} animate="animate" transition={{ repeat: Infinity, duration: 0.6, delay: 0.12 }} />
      <motion.span style={{ ...dotStyle, marginLeft: 6 }} variants={bounce} animate="animate" transition={{ repeat: Infinity, duration: 0.6, delay: 0.24 }} />
    </div>
  );
};

export default TypingLoader;

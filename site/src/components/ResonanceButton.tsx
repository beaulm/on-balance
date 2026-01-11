import { useState } from 'react';

interface ResonanceButtonProps {
  label?: string;
}

export default function ResonanceButton({ label = "This resonates" }: ResonanceButtonProps) {
  const [count, setCount] = useState(0);
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    if (!clicked) {
      setCount(count + 1);
      setClicked(true);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        padding: '0.5rem 1rem',
        fontSize: '1rem',
        cursor: clicked ? 'default' : 'pointer',
        backgroundColor: clicked ? '#f0f4e8' : '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
      }}
      disabled={clicked}
    >
      {clicked ? `${label} (+${count})` : `${label}`}
    </button>
  );
}

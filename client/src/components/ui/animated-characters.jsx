import { useRef, useEffect, useState } from 'react';

// ─── Pupil ────────────────────────────────────────────────────────────────────
export const Pupil = ({ size = 12, maxDistance = 5, pupilColor = 'black', forceLookX, forceLookY }) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  const pos = () => {
    if (!ref.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = mouse.x - cx, dy = mouse.y - cy;
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  };

  const { x, y } = pos();
  return (
    <div
      ref={ref}
      className="rounded-full"
      style={{ width: size, height: size, backgroundColor: pupilColor, transform: `translate(${x}px,${y}px)`, transition: 'transform 0.1s ease-out' }}
    />
  );
};

// ─── EyeBall ──────────────────────────────────────────────────────────────────
export const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = 'white', pupilColor = 'black', isBlinking = false, forceLookX, forceLookY }) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  const pos = () => {
    if (!ref.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = mouse.x - cx, dy = mouse.y - cy;
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  };

  const { x, y } = pos();
  return (
    <div
      ref={ref}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{ width: size, height: isBlinking ? 2 : size, backgroundColor: eyeColor, overflow: 'hidden' }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{ width: pupilSize, height: pupilSize, backgroundColor: pupilColor, transform: `translate(${x}px,${y}px)`, transition: 'transform 0.1s ease-out' }}
        />
      )}
    </div>
  );
};

// ─── Characters Scene ─────────────────────────────────────────────────────────
export const CharactersScene = ({ isTyping, showPassword, password }) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [purpleBlink, setPurpleBlink] = useState(false);
  const [blackBlink, setBlackBlink] = useState(false);
  const [lookingAtEachOther, setLookingAtEachOther] = useState(false);
  const [purplePeeking, setPurplePeeking] = useState(false);

  const purpleRef = useRef(null);
  const blackRef = useRef(null);
  const yellowRef = useRef(null);
  const orangeRef = useRef(null);

  useEffect(() => {
    const h = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  // Random blinking
  useEffect(() => {
    const blink = (setter) => {
      const t = setTimeout(() => {
        setter(true);
        setTimeout(() => { setter(false); blink(setter); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t1 = blink(setPurpleBlink);
    const t2 = blink(setBlackBlink);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Look at each other briefly when typing starts
  useEffect(() => {
    if (isTyping) {
      setLookingAtEachOther(true);
      const t = setTimeout(() => setLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    } else {
      setLookingAtEachOther(false);
    }
  }, [isTyping]);

  // Purple peeks when password is visible
  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const t = setTimeout(() => {
        setPurplePeeking(true);
        setTimeout(() => setPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return () => clearTimeout(t);
    } else {
      setPurplePeeking(false);
    }
  }, [password, showPassword, purplePeeking]);

  const calc = (ref) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 3;
    const dx = mouse.x - cx, dy = mouse.y - cy;
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    };
  };

  const pp = calc(purpleRef);
  const bp = calc(blackRef);
  const yp = calc(yellowRef);
  const op = calc(orangeRef);

  const hidingPassword = isTyping || (password.length > 0 && !showPassword);

  return (
    <div className="relative" style={{ width: 550, height: 400 }}>
      {/* Purple — back */}
      <div
        ref={purpleRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 70, width: 180,
          height: (showPassword && password.length > 0) ? 400 : hidingPassword ? 440 : 400,
          backgroundColor: '#6C3FF5',
          borderRadius: '10px 10px 0 0',
          zIndex: 1,
          transform: (showPassword && password.length > 0)
            ? 'skewX(0deg)'
            : hidingPassword
              ? `skewX(${(pp.bodySkew || 0) - 12}deg) translateX(40px)`
              : `skewX(${pp.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-8 transition-all duration-700 ease-in-out"
          style={{
            left: (showPassword && password.length > 0) ? 20 : lookingAtEachOther ? 55 : 45 + pp.faceX,
            top: (showPassword && password.length > 0) ? 35 : lookingAtEachOther ? 65 : 40 + pp.faceY,
          }}
        >
          {[0, 1].map(i => (
            <EyeBall key={i} size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D"
              isBlinking={purpleBlink}
              forceLookX={(showPassword && password.length > 0) ? (purplePeeking ? 4 : -4) : lookingAtEachOther ? 3 : undefined}
              forceLookY={(showPassword && password.length > 0) ? (purplePeeking ? 5 : -4) : lookingAtEachOther ? 4 : undefined}
            />
          ))}
        </div>
      </div>

      {/* Black — middle */}
      <div
        ref={blackRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 240, width: 120, height: 310,
          backgroundColor: '#2D2D2D',
          borderRadius: '8px 8px 0 0',
          zIndex: 2,
          transform: (showPassword && password.length > 0)
            ? 'skewX(0deg)'
            : lookingAtEachOther
              ? `skewX(${(bp.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
              : hidingPassword
                ? `skewX(${(bp.bodySkew || 0) * 1.5}deg)`
                : `skewX(${bp.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-6 transition-all duration-700 ease-in-out"
          style={{
            left: (showPassword && password.length > 0) ? 10 : lookingAtEachOther ? 32 : 26 + bp.faceX,
            top: (showPassword && password.length > 0) ? 28 : lookingAtEachOther ? 12 : 32 + bp.faceY,
          }}
        >
          {[0, 1].map(i => (
            <EyeBall key={i} size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D"
              isBlinking={blackBlink}
              forceLookX={(showPassword && password.length > 0) ? -4 : lookingAtEachOther ? 0 : undefined}
              forceLookY={(showPassword && password.length > 0) ? -4 : lookingAtEachOther ? -4 : undefined}
            />
          ))}
        </div>
      </div>

      {/* Orange — front left */}
      <div
        ref={orangeRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 0, width: 240, height: 200,
          zIndex: 3, backgroundColor: '#FF9B6B',
          borderRadius: '120px 120px 0 0',
          transform: (showPassword && password.length > 0) ? 'skewX(0deg)' : `skewX(${op.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-8 transition-all duration-200 ease-out"
          style={{
            left: (showPassword && password.length > 0) ? 50 : 82 + (op.faceX || 0),
            top: (showPassword && password.length > 0) ? 85 : 90 + (op.faceY || 0),
          }}
        >
          {[0, 1].map(i => (
            <Pupil key={i} size={12} maxDistance={5} pupilColor="#2D2D2D"
              forceLookX={(showPassword && password.length > 0) ? -5 : undefined}
              forceLookY={(showPassword && password.length > 0) ? -4 : undefined}
            />
          ))}
        </div>
      </div>

      {/* Yellow — front right */}
      <div
        ref={yellowRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: 310, width: 140, height: 230,
          backgroundColor: '#E8D754',
          borderRadius: '70px 70px 0 0',
          zIndex: 4,
          transform: (showPassword && password.length > 0) ? 'skewX(0deg)' : `skewX(${yp.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-6 transition-all duration-200 ease-out"
          style={{
            left: (showPassword && password.length > 0) ? 20 : 52 + (yp.faceX || 0),
            top: (showPassword && password.length > 0) ? 35 : 40 + (yp.faceY || 0),
          }}
        >
          {[0, 1].map(i => (
            <Pupil key={i} size={12} maxDistance={5} pupilColor="#2D2D2D"
              forceLookX={(showPassword && password.length > 0) ? -5 : undefined}
              forceLookY={(showPassword && password.length > 0) ? -4 : undefined}
            />
          ))}
        </div>
        <div
          className="absolute w-20 h-1 bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
          style={{
            left: (showPassword && password.length > 0) ? 10 : 40 + (yp.faceX || 0),
            top: (showPassword && password.length > 0) ? 88 : 88 + (yp.faceY || 0),
          }}
        />
      </div>
    </div>
  );
};

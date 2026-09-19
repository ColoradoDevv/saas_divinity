import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Clases extra para el contenedor con scroll (ej. borde/rounding propios cuando no hay una section envolvente). */
  className?: string;
}

const SHADOW_LEFT = 'inset 12px 0 12px -12px rgba(0,0,0,0.18)';
const SHADOW_RIGHT = 'inset -12px 0 12px -12px rgba(0,0,0,0.18)';

/**
 * Envuelve una tabla ancha con scroll horizontal y agrega una sombra sutil en el borde
 * que tiene más contenido — la pista visual que falta cuando `overflow-x-auto` corta
 * columnas en pantallas chicas sin avisar que se puede deslizar. Una sombra (en vez de
 * un degradado de color) se nota igual sin importar qué haya debajo (texto, badges, etc).
 */
export const ScrollableTableWrapper = ({ children, className = '' }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [children]);

  const boxShadow = [canScrollLeft && SHADOW_LEFT, canScrollRight && SHADOW_RIGHT].filter(Boolean).join(', ');

  return (
    <div
      ref={ref}
      className={`overflow-x-auto transition-shadow duration-200 ${className}`}
      style={boxShadow ? { boxShadow } : undefined}
    >
      {children}
    </div>
  );
};

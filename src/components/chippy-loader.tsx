import styled from 'styled-components';
import imgSrc from 'assets/images/chippy_600.png';
import {Theme} from 'src/utils/themes';
import {getDarkenedColor} from 'src/utils/color-math';
import {getSelectedTheme} from 'src/store/settingsSlice';
import {useAppSelector} from 'src/store/hooks';

const defaultChippy = {
  width: 300,
  height: 300,
  src: imgSrc,
};

const LoaderContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CircleContainer = styled.div<{
  $containerHeight: number;
  $containerWidth: number;
  $progress: number | null;
  $progressColor: string;
}>`
  border-radius: 50%;
  /* Upstream usa var(--bg_icon), un gris apagado pensado para iconos. La marca
     de Zelvoq esta hecha para fondo oscuro, como en el logo y el favicon. */
  background-color: var(--color_light-jet);
  box-shadow: inset 0 0 0 1px rgba(52, 212, 208, 0.18);
  height: ${(props) => props.$containerHeight}px;
  width: ${(props) => props.$containerWidth}px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;

  animation-duration: 1.5s;
  animation-name: roll;
  animation-iteration-count: infinite;
  animation-direction: alternate;
  animation-timing-function: ease-in-out;

  &::after {
    height: ${(props) => props.$containerHeight}px;
    width: ${(props) => props.$containerWidth}px;
    position: absolute;
    content: '';
    background-color: ${(p) => p.$progressColor};
    top: ${(props) => props.$containerHeight + 1}px;
    left: 0;
    right: 0;
    transition: transform 0.4s ease-out;
    transform: translate3d(
      0,
      ${(props) => -(props.$progress || 0) * props.$containerHeight}px,
      0
    );
  }
`;

type Props = {
  progress: number | null;
  width?: number;
  height?: number;
  theme: Theme;
};

/* La marca de Zelvoq sustituye a Chippy, la mascota de VIA.
 *
 * Se conserva la firma del componente (recibe theme, acepta props) para que el
 * contenedor circular y la barra de progreso de ChippyLoader sigan igual, y
 * para que rebasar con upstream toque solo este bloque.
 *
 * Los colores son los de marca y no derivan del tema a proposito: el logo
 * tiene que verse igual con cualquier tema de teclas. El acento del tema sigue
 * mandando en el circulo de progreso, que es de ChippyLoader. */
const SvgComponent: React.FC<any & {theme: Theme}> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="6 8 52 48"
    x={0}
    y={0}
    {...props}
  >
    <defs>
      <linearGradient
        id="zelvoq-edge"
        x1={10}
        y1={8}
        x2={54}
        y2={56}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopColor="#34d4d0" />
        <stop offset={0.52} stopColor="#f2bd4b" />
        <stop offset={1} stopColor="#eb4aa3" />
      </linearGradient>
    </defs>
    <rect
      x={13}
      y={31}
      width={11}
      height={15}
      rx={4}
      fill="#34d4d0"
      opacity={0.32}
    />
    <rect
      x={43}
      y={18}
      width={9}
      height={13}
      rx={4}
      fill="#eb4aa3"
      opacity={0.34}
    />
    <path
      d="M14 16h24L22 48h24"
      fill="none"
      stroke="url(#zelvoq-edge)"
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25 18h22L29 46h24"
      fill="none"
      stroke="#f7fbf7"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ChippyLoader(props: Props) {
  const width = props.width || defaultChippy.width;
  const height = props.width || defaultChippy.height;
  const containerPadding = width * 0.25;
  const [containerHeight, containerWidth] = [
    height + containerPadding * 2,
    width + containerPadding * 2,
  ];
  const selectedTheme = useAppSelector(getSelectedTheme);

  return (
    <LoaderContainer>
      <CircleContainer
        $progress={props.progress}
        $progressColor={getDarkenedColor(selectedTheme.accent.c, 0.9)}
        $containerHeight={containerHeight}
        $containerWidth={containerWidth}
      >
        <div
          style={{
            zIndex: 1,
            width: width,
          }}
        >
          <SvgComponent theme={props.theme} />
        </div>
      </CircleContainer>
    </LoaderContainer>
  );
}

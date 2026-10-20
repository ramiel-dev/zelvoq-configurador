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
  box-shadow: inset 0 0 0 1px rgba(82, 212, 188, 0.18);
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
 * mandando en el circulo de progreso, que es de ChippyLoader.
 *
 * La Z es la misma curva que la del logotipo de la tienda y la del favicon de
 * aqui al lado: sale de la fuente, no esta redibujada, asi que las dos marcas
 * no pueden separarse con el tiempo. La curva se describe con el eje Y hacia
 * arriba, de ahi la escala negativa; el translate centra su caja -de 158 a
 * 1680 en X- dentro del viewBox. */
const SvgComponent: React.FC<any & {theme: Theme}> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    x={0}
    y={0}
    {...props}
  >
    <path
      transform="translate(9.03 57.6) scale(0.025 -0.025)"
      d="M164 0V231L1214 1737H158V2048H1674V1817L625 311H1680V0Z"
      fill="#52d4bc"
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

import {faGithub} from '@fortawesome/free-brands-svg-icons';
import {faCircleInfo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import {CategoryMenuTooltip} from '../inputs/tooltip';
import {CategoryIconContainer} from '../panes/grid';

const ExternalLinkContainer = styled.span`
  position: absolute;
  right: 1em;
  display: flex;
  gap: 1em;
  align-items: center;
`;

const Marca = styled.a`
  font-weight: 600;
  letter-spacing: 0.02em;
  font-size: 1.05em;
  color: var(--color_accent);
  text-decoration: none;
  opacity: 1;
`;

/* Los enlaces de VIA (su web, su Discord, su repo) se cambian por los de
 * Zelvoq. El de GitHub apunta a NUESTRO fork, que es lo que exige la GPL-3.0:
 * al servir este JavaScript modificado lo estamos distribuyendo, asi que hay
 * que ofrecer su codigo. El de informacion deja claro que esto deriva de VIA
 * y que no hay afiliacion: la GPL cubre el codigo, no la marca. */
export const ExternalLinks = () => (
  <ExternalLinkContainer>
    <Marca href="https://keyboards.zelvoq.cl" target="_blank">
      Zelvoq
    </Marca>
    <a href="https://zelvoq.cl" target="_blank">
      <CategoryIconContainer>
        <FontAwesomeIcon size={'xl'} icon={faCircleInfo} />
        <CategoryMenuTooltip>Tienda y soporte</CategoryMenuTooltip>
      </CategoryIconContainer>
    </a>
    <a
      href={`${import.meta.env.BASE_URL}LICENSE`}
      target="_blank"
      rel="noopener noreferrer"
    >
      GPL-3.0 · derivado de VIA
    </a>
    <a
      href="https://github.com/ramiel-dev/zelvoq-configurador"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Código fuente GPL-3.0 del configurador Zelvoq"
    >
      <CategoryIconContainer>
        <FontAwesomeIcon size={'xl'} icon={faGithub} />
        <CategoryMenuTooltip>
          Codigo fuente (GPL-3.0, derivado de VIA)
        </CategoryMenuTooltip>
      </CategoryIconContainer>
    </a>
  </ExternalLinkContainer>
);

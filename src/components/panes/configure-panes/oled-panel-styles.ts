import styled from 'styled-components';

export const Surface = styled.section`
  --oled-ink-accent: color-mix(
    in srgb,
    var(--color_accent) 65%,
    var(--color_label-highlighted)
  );
  box-sizing: border-box;
  min-height: 100%;
  padding: 32px clamp(16px, 4vw, 44px);
  background: var(--bg_menu);
  color: var(--color_label-highlighted);
  font-size: 14px;
  line-height: 1.5;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  h2,
  h3,
  p {
    margin: 0;
    color: inherit;
  }
  button,
  input {
    font: inherit;
  }
  button {
    cursor: pointer;
  }
  button:focus-visible,
  input:focus-visible + span {
    outline: 2px solid var(--oled-ink-accent);
    outline-offset: 4px;
  }
  button:disabled {
    cursor: default;
    opacity: 0.5;
  }
  @media (max-width: 480px) {
    padding-top: 22px;
  }
`;
export const Content = styled.div`
  max-width: 960px;
  margin: 0 auto;
`;
export const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  h2 {
    font-size: clamp(26px, 3vw, 32px);
    line-height: 1.2;
    letter-spacing: -0.035em;
  }
  p {
    color: var(--color_label);
    font-size: 14px;
    margin-top: 8px;
    max-width: 540px;
  }
  .model {
    display: block;
    color: var(--oled-ink-accent);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .display-icon {
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: var(--bg_control);
    border: 1px solid var(--border_color_cell);
    border-radius: 12px;
    color: var(--color_accent);
    font-size: 20px;
  }
  @media (max-width: 480px) {
    .display-icon {
      display: none;
    }
  }
`;
export const PowerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 20px;
  border: 1px solid var(--border_color_cell);
  border-radius: 10px;
  margin-bottom: 20px;
  .power-copy {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }
  .power-icon {
    color: var(--color_accent);
    font-size: 17px;
  }
  strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
  }
  p {
    font-size: 12px;
    color: var(--color_label);
    margin-top: 2px;
  }
  @media (max-width: 480px) {
    padding: 14px;
    gap: 12px;
    .power-icon {
      display: none;
    }
  }
`;
export const Power = styled.label`
  width: 48px;
  height: 44px;
  position: relative;
  flex-shrink: 0;
  display: grid;
  align-items: center;
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 1;
  }
  span {
    display: block;
    height: 26px;
    border: 1px solid var(--color_label);
    border-radius: 20px;
    background: var(--bg_control);
  }
  span::before {
    content: '';
    display: block;
    width: 18px;
    height: 18px;
    margin: 3px;
    border-radius: 50%;
    background: var(--color_label);
  }
  input:checked + span {
    background: var(--color_accent);
    border-color: var(--color_accent);
  }
  input:checked + span::before {
    background: var(--color_inside-accent);
    transform: translateX(21px);
  }
  input:disabled {
    cursor: default;
  }
  input:disabled + span {
    opacity: 0.4;
  }
  @media (prefers-reduced-motion: no-preference) {
    span,
    span::before {
      transition:
        background 0.15s,
        transform 0.15s;
    }
  }
`;
export const Preview = styled.div`
  overflow: hidden;
  border: 1px solid #34433a;
  border-radius: 14px;
  background: #0c110f;
  color: #e1eee5;
  .preview-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid #243229;
    background: #111a15;
  }
  .preview-title {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .preview-title strong {
    font-size: 10px;
    letter-spacing: 0.13em;
    font-weight: 600;
    color: #a4b5aa;
  }
  .mode {
    font-size: 12px;
    color: #e1eee5;
    border-left: 1px solid #34433a;
    padding-left: 10px;
  }
  .preview-body {
    padding: 30px clamp(16px, 3vw, 36px);
    background: radial-gradient(ellipse at 50% 0%, #18291e, transparent 75%);
  }
  figure {
    margin: 0 auto;
    min-width: 0;
    width: 100%;
    max-width: 380px;
  }
  figcaption {
    color: #a4b5aa;
    font-size: 11px;
    letter-spacing: 0.025em;
    margin-bottom: 12px;
    text-align: left;
  }
  .screens {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(16px, 3vw, 32px);
    align-items: center;
  }
  picture,
  .off {
    display: block;
    padding: clamp(10px, 1.6vw, 16px);
    background: #080b0a;
    border: 1px solid #35423b;
    border-radius: 8px;
    box-shadow:
      0 8px 20px #0005,
      inset 0 1px 0 #ffffff0a;
  }
  .off::before {
    content: '';
    display: block;
    aspect-ratio: 4;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 4;
    image-rendering: pixelated;
  }
  @media (max-width: 520px) {
    .screens {
      grid-template-columns: 1fr;
      gap: 22px;
    }
    .preview-toolbar {
      padding: 12px 14px;
    }
    .preview-body {
      padding: 24px 16px;
    }
  }
`;
export const PreviewAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #d1e1d6;
  background: transparent;
  border: 1px solid #3d4e43;
  border-radius: 6px;
  padding: 7px 10px;
  min-height: 36px;
  font-size: 11px !important;
  &:hover:not(:disabled) {
    background: #23382b;
    border-color: #6a8a75;
  }
`;
export const PreviewCaption = styled.div`
  padding: 12px 2px 22px;
  p {
    color: var(--color_label);
    font-size: 12px;
    line-height: 1.6;
  }
  p + p {
    margin-top: 5px;
    font-size: 11px;
  }
`;
export const DesignHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  h3 {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  p {
    color: var(--color_label);
    font-size: 12px;
  }
`;
export const Designs = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;
export const Design = styled.button<{$selected: boolean}>`
  min-width: 0;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid
    ${({$selected}) => ($selected ? 'var(--color_accent)' : 'var(--border_color_cell)')};
  box-shadow: ${({$selected}) => ($selected ? 'inset 0 0 0 1px var(--color_accent)' : 'none')};
  color: inherit;
  background: ${({$selected}) => ($selected ? 'color-mix(in srgb, var(--color_accent) 8%, var(--bg_menu))' : 'transparent')};
  text-align: left;
  &:hover:not(:disabled) {
    border-color: var(--color_accent);
    background: color-mix(in srgb, var(--color_accent) 6%, var(--bg_menu));
  }
  .design-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }
  strong {
    font-size: 14px;
    font-weight: 600;
  }
  .selection {
    display: grid;
    place-items: center;
    width: 19px;
    height: 19px;
    border: 1px solid
      ${({$selected}) => ($selected ? 'var(--color_accent)' : 'var(--color_label)')};
    border-radius: 50%;
    background: ${({$selected}) => ($selected ? 'var(--color_accent)' : 'transparent')};
    color: var(--color_inside-accent);
    font-size: 10px;
    flex-shrink: 0;
  }
  .thumbnail {
    background: #080b0a;
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #34433a;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 4;
    image-rendering: pixelated;
  }
  .description {
    display: block;
    color: var(--color_label);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 12px;
  }
`;
export const Footer = styled.footer`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border_color_cell);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  .device-state {
    font-size: 12px;
    color: var(--color_label);
    margin-top: 5px;
  }
  .device-state strong {
    font-weight: 500;
  }
`;
export const SaveState = styled.span<{$pending: boolean}>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 500;
  color: ${({$pending}) => ($pending ? 'var(--oled-ink-accent)' : 'var(--color_label)')};
  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }
`;
export const Message = styled.div<{$error: boolean}>`
  color: ${({$error}) => ($error ? 'var(--color_error)' : 'var(--color_label-highlighted)')};
  font-size: 13px;
  &:not(:empty) {
    padding: 12px 14px;
    margin-top: 18px;
    border: 1px solid
      ${({$error}) => ($error ? 'var(--color_error)' : 'var(--border_color_cell)')};
    border-radius: 8px;
  }
`;
export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 10px 14px;
    border-radius: 7px;
    border: 1px solid var(--border_color_cell);
    background: transparent;
    color: inherit;
    font-size: 12px;
    font-weight: 500;
  }
  button:first-child {
    color: var(--color_inside-accent);
    background: var(--color_accent);
    border-color: var(--color_accent);
  }
  button:hover:not(:disabled) {
    filter: brightness(1.12);
  }
  @media (max-width: 480px) {
    width: 100%;
    button {
      flex: 1;
    }
  }
`;

import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faDesktop} from '@fortawesome/free-solid-svg-icons';
import {SpanOverflowCell} from '../grid';
import {useAppSelector} from '../../../store/hooks';
import {
  getIsSelectedDeviceReady,
  getSelectedDevicePath,
  getSelectedKeyboardAPI,
} from '../../../store/devicesSlice';
import {OledPanel} from './oled-panel';

export const Title = 'Pantalla';
export const Icon = () => <FontAwesomeIcon icon={faDesktop} />;
export const Pane = () => {
  const api = useAppSelector(getSelectedKeyboardAPI);
  const path = useAppSelector(getSelectedDevicePath);
  const ready = useAppSelector(getIsSelectedDeviceReady);
  return (
    <SpanOverflowCell>
      <OledPanel
        key={path ?? 'none'}
        api={api || null}
        deviceKey={path ?? ''}
        ready={ready}
      />
    </SpanOverflowCell>
  );
};

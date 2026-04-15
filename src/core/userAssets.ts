import { I18n } from '../i18n.ts';
import type { UserAsset } from '../types.ts';

export const UserAssets = (() => {
  let _assets: UserAsset[] = [];
  let _nextId = 0;
  let _onChangeCb: (assets: UserAsset[]) => void = () => {};

  function init(onChangeCallback: (assets: UserAsset[]) => void) {
    _onChangeCb = typeof onChangeCallback === 'function' ? onChangeCallback : () => {};
  }

  function add(file: File): Promise<UserAsset> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error(I18n.t('error.notImage', file.name)));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataURL = String(e.target?.result || '');
        const img = new Image();

        img.onload = () => {
          const asset: UserAsset = {
            id: _nextId++,
            name: file.name,
            dataURL,
            img,
            type: 'any',
          };

          _assets.push(asset);
          _notify();
          resolve(asset);
        };

        img.onerror = () => reject(new Error(I18n.t('error.decodeFail', file.name)));
        img.src = dataURL;
      };

      reader.onerror = () => reject(new Error(I18n.t('error.readFail', file.name)));
      reader.readAsDataURL(file);
    });
  }

  function remove(id: number) {
    _assets = _assets.filter((a) => a.id !== id);
    _notify();
  }

  function setType(id: number, type: UserAsset['type']) {
    const asset = _assets.find((a) => a.id === id);
    if (!asset) return;
    asset.type = type;
  }

  function getByType(type: UserAsset['type']) {
    const exact = _assets.filter((a) => a.type === type);
    if (exact.length > 0) return exact;
    return _assets.filter((a) => a.type === 'any');
  }

  function getAll() {
    return [..._assets];
  }

  function hasAny() {
    return _assets.length > 0;
  }

  function clear() {
    _assets = [];
    _notify();
  }

  function _notify() {
    _onChangeCb([..._assets]);
  }

  return { init, add, remove, setType, getByType, getAll, hasAny, clear };
})();

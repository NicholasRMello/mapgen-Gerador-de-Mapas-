/**
 * userAssets.js — Gerenciamento de imagens enviadas pelo usuário
 *
 * Responsabilidades:
 *  - Receber arquivos de imagem via drag-and-drop ou seleção de arquivo
 *  - Manter um cache local (em memória) com as imagens carregadas
 *  - Permitir que o usuário defina o tipo de cada imagem
 *    (qualquer | normal | início | final | boss)
 *  - Fornecer imagens ao MapGenerator ordenadas por tipo de sala
 *
 * Estrutura de um UserAsset:
 * {
 *   id:      number,   // identificador único auto-incrementado
 *   name:    string,   // nome original do arquivo
 *   dataURL: string,   // base64 da imagem (para persistência e exibição)
 *   img:     HTMLImageElement,
 *   type:    string,   // 'any' | 'normal' | 'start' | 'end' | 'boss'
 * }
 *
 * Cadeia de fallback no MapGenerator:
 *   getByType(roomType) → exact match → 'any' → [] (gerador usa fallback colorido)
 */

const UserAssets = (() => {

  // Array interno de assets do usuário
  // Modificado apenas pelas funções do módulo
  let _assets = [];

  // Contador auto-incrementado para IDs únicos
  let _nextId = 0;

  // Função de callback chamada sempre que o estado de _assets mudar
  // Usada pelo main.js para re-renderizar a sidebar
  let _onChangeCb = null;

  // ---------------------------------------------------
  // init(onChangeCallback)
  // Registra a função de callback que será chamada
  // sempre que assets forem adicionados, removidos ou
  // tiverem seu tipo alterado.
  //
  // @param {Function} onChangeCallback  recebe o array atual de assets
  // ---------------------------------------------------
  function init(onChangeCallback) {
    _onChangeCb = typeof onChangeCallback === 'function'
      ? onChangeCallback
      : function () {};
  }

  // ---------------------------------------------------
  // add(file)
  // Lê um arquivo de imagem via FileReader, cria um
  // HTMLImageElement e armazena no cache interno.
  //
  // O tipo padrão é 'any': a imagem pode ser usada para
  // qualquer tipo de sala até o usuário mudar.
  //
  // @param {File} file  arquivo de imagem (image/*)
  // @returns {Promise<UserAsset>}  resolve com o asset criado
  // ---------------------------------------------------
  function add(file) {
    return new Promise((resolve, reject) => {

      // Rejeita arquivos que não sejam imagens
      if (!file.type.startsWith('image/')) {
        console.warn(`[UserAssets] Arquivo ignorado (não é imagem): "${file.name}"`);
        reject(new Error(`"${file.name}" não é uma imagem.`));
        return;
      }

      // Lê o arquivo como Data URL (base64) para exibição na sidebar
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataURL = e.target.result;

        // Cria o elemento de imagem para uso no canvas (drawImage)
        const img = new Image();

        img.onload = () => {
          // Monta o objeto de asset com todas as propriedades necessárias
          const asset = {
            id:      _nextId++,
            name:    file.name,
            dataURL,
            img,
            type:    'any',   // tipo padrão: pode ser usado para qualquer sala
          };

          _assets.push(asset);

          // Notifica o main.js para re-renderizar a sidebar
          _notify();

          resolve(asset);
        };

        img.onerror = () => {
          console.warn(`[UserAssets] Não foi possível decodificar imagem: "${file.name}"`);
          reject(new Error(`Falha ao decodificar "${file.name}".`));
        };

        // Inicia o carregamento da imagem a partir do Base64
        img.src = dataURL;
      };

      reader.onerror = () => {
        reject(new Error(`Falha ao ler o arquivo "${file.name}".`));
      };

      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------
  // remove(id)
  // Remove um asset do cache pelo seu ID.
  // Notifica o callback após a remoção.
  //
  // @param {number} id  identificador único do asset
  // ---------------------------------------------------
  function remove(id) {
    // Filtra o asset com o ID fornecido, mantendo todos os outros
    _assets = _assets.filter(a => a.id !== id);
    _notify();
  }

  // ---------------------------------------------------
  // setType(id, type)
  // Altera o tipo de um asset existente.
  // O tipo controla quais salas podem usar esta imagem.
  //
  // NÃO dispara _notify() intencionalmente: o seletor na sidebar
  // já reflete o novo estado imediatamente pelo próprio evento
  // 'change' do DOM. Re-renderizar a lista toda destruiria o foco
  // no elemento e causaria piscar desnecessário.
  //
  // @param {number} id    identificador único do asset
  // @param {string} type  'any' | 'normal' | 'start' | 'end' | 'boss'
  // ---------------------------------------------------
  function setType(id, type) {
    const asset = _assets.find(a => a.id === id);
    if (!asset) return;

    // Apenas muta o dado interno — a sidebar já mostra o valor correto
    asset.type = type;
  }

  // ---------------------------------------------------
  // getByType(type)
  // Retorna assets cujo tipo corresponde ao solicitado.
  //
  // Lógica de fallback:
  //  1. Busca assets com type === roomType (correspondência exata)
  //  2. Se não encontrar, retorna assets com type === 'any'
  //  3. Se nenhum, retorna array vazio (gerador usa fallback colorido)
  //
  // Isso garante que imagens "Qualquer/any" preenchem lacunas quando
  // não há nenhuma imagem específica para aquele tipo de sala.
  //
  // @param {string} type  tipo de sala solicitado
  // @returns {UserAsset[]}
  // ---------------------------------------------------
  function getByType(type) {
    // Busca por correspondência exata de tipo
    const exact = _assets.filter(a => a.type === type);
    if (exact.length > 0) return exact;

    // Fallback: retorna imagens marcadas como "Qualquer"
    return _assets.filter(a => a.type === 'any');
  }

  // ---------------------------------------------------
  // getAll()
  // Retorna uma cópia de todos os assets carregados.
  // Usado pela sidebar para renderizar os cards.
  //
  // @returns {UserAsset[]}
  // ---------------------------------------------------
  function getAll() {
    return [..._assets];
  }

  // ---------------------------------------------------
  // hasAny()
  // Indica se há pelo menos um asset carregado.
  // Usado pelo MapGenerator para decidir entre
  // user assets e AssetLoader.
  //
  // @returns {boolean}
  // ---------------------------------------------------
  function hasAny() {
    return _assets.length > 0;
  }

  // ---------------------------------------------------
  // clear()
  // Remove todos os assets e notifica o callback.
  // ---------------------------------------------------
  function clear() {
    _assets = [];
    _notify();
  }

  // ---------------------------------------------------
  // _notify()
  // Chama o callback registrado com o array atual.
  // Função interna — não exposta na API pública.
  // ---------------------------------------------------
  function _notify() {
    if (_onChangeCb) _onChangeCb([..._assets]);
  }

  // ---------------------------------------------------
  // API pública
  // ---------------------------------------------------
  return { init, add, remove, setType, getByType, getAll, hasAny, clear };

})();

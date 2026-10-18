export const contactConfig = {
 whatsapp: '5573981839889',
 message: 'Olá, Pedro! Vi seu portfólio e gostaria de conversar sobre um projeto audiovisual.',
 instagram: 'https://www.instagram.com/p.pierote_/', handle: '@p.pierote_'
};
export const whatsappUrl = (message=contactConfig.message)=>`https://wa.me/${contactConfig.whatsapp}?text=${encodeURIComponent(message)}`;
const entries = [
 [0,700,894,'Bastidores','Pedro com câmera e flash nos bastidores'],
 [1,695,860,'Conteúdo','Câmera profissional, smartphone e equipamentos de produção'],
 [2,654,848,'Bastidores','Pedro apresenta a câmera durante uma cobertura'],
 [3,693,853,'Shows','Cantor com microfone sob luz azul'],
 [4,688,832,'Shows','Artista de preto diante de luzes vermelhas no palco'],
 [5,647,865,'Shows','Cantor de camisa azul cumprimenta o público'],
 [6,686,844,'Shows','Cantor com microfone branco e luzes azuis ao fundo'],
 [7,647,903,'Shows','Artista no palco entre efeitos de fogo e luz laranja'],
 [8,668,849,'Shows','Retrato de cantor com camisa preta durante apresentação'],
 [9,657,856,'Shows','Cantor com camisa verde em apresentação ao vivo'],
 [10,632,855,'Eventos','Visão do palco com músicos e iluminação azul'],
 [11,710,577,'Conteúdo','Pedro registra um evento com smartphone'],
 [12,427,579,'Bastidores','Pedro com equipamentos durante cobertura de evento'],
 [13,456,586,'Bastidores','Pedro sorrindo nos bastidores de um evento'],
 [14,649,814,'Conteúdo','Pedro concentra o olhar no smartphone durante uma gravação'],
 [15,659,844,'Bastidores','Pedro junto ao público sob iluminação vermelha'],
 [16,464,836,'Shows','Artista de camisa clara no palco iluminado'],
 [17,471,802,'Shows','Cantor em apresentação sob luz magenta'],
 [18,492,688,'Fotografia','Cavaleiro e cavalo em movimento na pista de areia'],
 [19,496,620,'Fotografia','Registro externo de cavaleiro levantando areia na pista']
];
export const portfolioData = entries.map(([id,width,height,category,alt])=>({id,image:`images/${String(id).padStart(2,'0')}.webp`,thumbnail:`images/${String(id).padStart(2,'0')}-small.webp`,thumbnailWidth:id===16?344:id===17?364:420,width,height,category,alt,objectPosition:'50% 50%',aspectRatio:width/height,orientation:width>height?'landscape':'portrait'}));
export const getPhoto = id => portfolioData.find(item=>item.id===id);

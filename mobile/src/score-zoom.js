// Tamaño único para los botones y el gesto de pellizcar.
const MIN_READER_FONT=10;
const MAX_READER_FONT=46;
const DEFAULT_READER_FONT=15;
function clampReaderFont(value){
 const size=Number(value);
 if(!Number.isFinite(size))return DEFAULT_READER_FONT;
 return Math.min(MAX_READER_FONT,Math.max(MIN_READER_FONT,Math.round(size*10)/10));
}
module.exports={MIN_READER_FONT,MAX_READER_FONT,DEFAULT_READER_FONT,clampReaderFont};

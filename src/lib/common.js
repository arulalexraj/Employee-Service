exports.generateGUID = () => {
   var id_str = [];
   var hxDigits = "0123456789abcdef";
   for (var i = 0; i < 36; i++) {
      id_str[i] = hxDigits.substr(Math.floor(Math.random() * 0x10), 1);
   }
   id_str[14] = "4"; // bits 12-15 is for time_hi_and_version field, set to to 0010

   id_str[19] = hxDigits.substr((id_str[19] & 0x3) | 0x8, 1); // bits 6-7 for the clock_seq_hi_and_reserved to 01

   id_str[8] = id_str[13] = id_str[18] = id_str[23] = "-";

   var guid = id_str.join("");
   return guid;
}

exports.getBinarySize = (string) => {
   return Buffer.byteLength(string, 'utf8');
}
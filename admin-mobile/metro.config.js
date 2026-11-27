const path=require("node:path");
const {getDefaultConfig}=require("expo/metro-config");
const config=getDefaultConfig(__dirname);
// The shared liturgical files are plain JavaScript with no native dependencies.
config.watchFolders=[...new Set([...(config.watchFolders||[]),path.resolve(__dirname,"../mobile/src"),path.resolve(__dirname,"..")])];
module.exports=config;

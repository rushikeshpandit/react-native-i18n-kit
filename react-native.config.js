module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.i18nkit.I18nKitPackage;',
        packageInstance: 'new I18nKitPackage()',
      },
    },
  },
};

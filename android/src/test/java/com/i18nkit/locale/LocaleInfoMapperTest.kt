package com.i18nkit.locale

import org.junit.Assert.assertEquals
import org.junit.Test

/** JVM unit tests for the pure (bridge-free) logic in [LocaleInfoMapper]. */
class LocaleInfoMapperTest {

    @Test
    fun `legacy Hebrew code iw maps to he`() {
        assertEquals("he", LocaleInfoMapper.normalizeLanguageCode("iw"))
    }

    @Test
    fun `legacy Indonesian code in maps to id`() {
        assertEquals("id", LocaleInfoMapper.normalizeLanguageCode("in"))
    }

    @Test
    fun `legacy Yiddish code ji maps to yi`() {
        assertEquals("yi", LocaleInfoMapper.normalizeLanguageCode("ji"))
    }

    @Test
    fun `modern and unrelated codes are returned unchanged`() {
        listOf("he", "id", "yi", "en", "fr", "ar", "hi", "pt").forEach {
            assertEquals(it, LocaleInfoMapper.normalizeLanguageCode(it))
        }
    }

    @Test
    fun `empty and unknown codes are returned unchanged`() {
        assertEquals("", LocaleInfoMapper.normalizeLanguageCode(""))
        assertEquals("zz", LocaleInfoMapper.normalizeLanguageCode("zz"))
    }

    @Test
    fun `normalization is case sensitive like Locale getLanguage output`() {
        assertEquals("IW", LocaleInfoMapper.normalizeLanguageCode("IW"))
    }
}

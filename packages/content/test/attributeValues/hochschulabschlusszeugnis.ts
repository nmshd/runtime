const myMultiLineString = `
'<?xml version="1.0" encoding="UTF-8"?>
<!-- 
    Hochschulabschlusszeugnis nach XHochschule Version 0.94. Nichtnormative Beispielinstanz für ein  
    Hochschulabschlusszeugnis. Dieses wird (z.B.) für einem Studienplatzwechsel von einem Bachelorstudiengang 
    zu einem Masterstudiengang benötigt.
    Version: XHochschule 0.94 
    Letzte Aktualisierung: 13.01.2023
    Lizenz: Creative Commons 4.0 Namensnennung International, "]init[ AG im Auftrag von BMBF und Land Sachsen-Anhalt"
-->
<xhs:hochschulabschlusszeugnis xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://xhochschule.de/def/xhochschule/0.94/xsd https://xhochschule.de/def/xhochschule/0.94/xsd/xhochschule.xsd"
    xmlns:xhs="http://xhochschule.de/def/xhochschule/0.94/xsd"
    xmlns:xbd="http://xbildung.de/def/xbildung/0.93/xsd"> 
    
    <!-- Allgemeine Eigenschaften des Hochschulabschlusszeugnis -->
    <xbd:titel xml:lang="de-DE">Hochschulabschlusszeugnis</xbd:titel>
    <xbd:ausstellung>
        <xbd:datum>2021-07-01</xbd:datum>
        <xbd:ort>Saarbrücken</xbd:ort>
    </xbd:ausstellung>
    <xbd:gueltigkeitszeitraum>
        <xbd:beginn>2021-07-01</xbd:beginn>
    </xbd:gueltigkeitszeitraum>
    <xbd:sprache>
        <xbd:sprache listURI="urn:xbildung-de:publicationsoffice-eu:codeliste:language" listVersionID="20210929-0">
            <code>https://publications.europa.eu/resource/authority/language/DEU</code>
        </xbd:sprache>
    </xbd:sprache>
    <xhs:abschluss listURI="urn:xhochschule-de:destatis:codeliste:artdeshochschulabschlusses" listVersionID="WS22">
        <!-- Art des Abschlusses als Code 182: Bachelor an Universitäten, Erststudium -->
        <code>http://xhochschule.de/def/destatis/WS22/code/ArtDesHochschulabschlusses/182</code>
    </xhs:abschluss>
    
    <!-- Angaben zur studierenden Person -->
    <xhs:studierender>
        <xbd:nameNatuerlichePerson>
            <xbd:familienname>
                <xbd:name>Mustermann</xbd:name>            
            </xbd:familienname>          
            <xbd:vorname>
                <xbd:name>Erika</xbd:name>                                
            </xbd:vorname>           
        </xbd:nameNatuerlichePerson>
        <xbd:geburt>
            <xbd:datum>1983-08-12</xbd:datum>
            <xbd:geburtsort>               
                <xbd:ort>Berlin</xbd:ort>
                <xbd:staat listURI="urn:xoev-de:kosit:codeliste:country-codes" listVersionID="unbestimmt">
                    <code>DE</code>
                </xbd:staat>               
            </xbd:geburtsort>
        </xbd:geburt>               
        <!-- Optionale/zukünftige Identifikationsarten für die studierende Person -->
        <xbd:identifikationsnummer>
            <xbd:id>86095742719</xbd:id>
            <xbd:beschreibung>ID nach Identifikationsnummerngesetz (abgeleitet von SteuerID)</xbd:beschreibung>
            <xbd:gueltigkeit>
                <xbd:beginn>1983-08-12</xbd:beginn>
            </xbd:gueltigkeit>
        </xbd:identifikationsnummer>
        <xbd:identifikationsnummer>
            <xbd:id>99-999-999-999</xbd:id>
            <xbd:beschreibung>OZG-Landeskonto-ID der studierenden Person</xbd:beschreibung>
            <xbd:gueltigkeit>
                <xbd:beginn>2001-08-12</xbd:beginn>
            </xbd:gueltigkeit>
        </xbd:identifikationsnummer>
        <xbd:identifikationsnummer>
            <xbd:id>uuid:57a42c1a-be5e-460b-bf2b-7fa77ef0364a</xbd:id>
            <xbd:beschreibung>eIDAS ID der studierenden Person</xbd:beschreibung>
            <xbd:gueltigkeit>
                <xbd:beginn>2002-08-12</xbd:beginn>
            </xbd:gueltigkeit>
        </xbd:identifikationsnummer>
        <xbd:identifikationsnummer>
            <xbd:id>urn:schac:personalUniqueCode:int:esi:de:99-999-999-999</xbd:id>
            <xbd:beschreibung>European Student Identifier der studierenden Person</xbd:beschreibung>
            <xbd:gueltigkeit>
                <xbd:beginn>2003-08-12</xbd:beginn>
            </xbd:gueltigkeit>
        </xbd:identifikationsnummer>  
        <!-- Matrikelnummer der studierenden Person -->
        <xhs:matrikelnummer>
            <xbd:id>1023909</xbd:id>
            <xbd:beschreibung>Matrikelnummer der studierenden Person</xbd:beschreibung>
            <xbd:gueltigkeit>
                <xbd:beginn>2017-10-01</xbd:beginn>
            </xbd:gueltigkeit>
        </xhs:matrikelnummer>
    </xhs:studierender>
    
    <!-- Angaben zur ausstellenden Hochschule -->
    <xhs:ausstellendeHochschule>
        <xhs:hochschulsignatur listURI="urn:xhochschule-de:destatis:codeliste:hochschulsignatur" listVersionID="WS22">
            <code>http://xhochschule.de/def/destatis/WS22/code/hochschulsignatur/1360</code>
        </xhs:hochschulsignatur>        
        <xhs:name>Universität des Saarlandes</xhs:name>    
    </xhs:ausstellendeHochschule>     
    
    <!-- Angaben zu zugehörigen Dokumenten -->
    <xhs:diplomaSupplementVerweis>DS_1023909</xhs:diplomaSupplementVerweis>
    <xhs:transcriptOfRecordVerweis>TOR_1023909</xhs:transcriptOfRecordVerweis>
    
    <!-- Angaben zum Studienfach -->
    <xhs:studienfach>       
        <xhs:name xml:lang="de-DE">Informatik</xhs:name>  
        <xhs:angestrebterAbschluss>Bachelor of Science</xhs:angestrebterAbschluss>
        <xhs:schluesselDESTATIS listURI="urn:xhochschule-de:destatis:codeliste:faecherschluessel" listVersionID="WS22">
            <code>http://xhochschule.de/def/destatis/WS22/code/faecherschluessel/079</code>  
        </xhs:schluesselDESTATIS>
        <xhs:fachsemester>8</xhs:fachsemester>
        <xhs:schluesselISCED2011 listURI="urn:xbildung-de:unesco:codeliste:isced2011" listVersionID="ISCED-2011">
            <code>645</code>
        </xhs:schluesselISCED2011>
        <xhs:schluesselISCED2013 listURI="urn:xbildung-de:publicationsoffice-eu:taxonomie:isced-f-2013" listVersionID="ISCED-F 2013">
            <code>0610</code>
        </xhs:schluesselISCED2013>               
        <xhs:studienbereichDESTATIS listURI="urn:xhochschule-de:destatis:codeliste:studienbereich" listVersionID="WS22">
            <code>http://xhochschule.de/def/destatis/WS22/code/studienbereich/54</code>
        </xhs:studienbereichDESTATIS>
        <xhs:studienbereichBezeichnung xml:lang="de-DE">Informatik</xhs:studienbereichBezeichnung>        
    </xhs:studienfach>
            
    <!-- Angaben zur Benotung -->    
    <xhs:benotung>
        <xhs:gesamtnote>
            <xbd:note>2,1</xbd:note>
            <xbd:wortbezeichnung xml:lang="de-DE">gut</xbd:wortbezeichnung>
            <xbd:punkte>540</xbd:punkte>            
        </xhs:gesamtnote>
        <xhs:lateinischeEhrenbezeichnung listURI="urn:xhochschule-de:xhochschule:codeliste:lateinischeehrenbezeichnung" listVersionID="0.94">
            <code>http://xhochschule.de/def/xhochschule/0.94/code/lateinischeehrenbezeichnung/cum_laude</code>
        </xhs:lateinischeEhrenbezeichnung>
    </xhs:benotung>    
    <xhs:abschlussarbeit>
        <xbd:titelDerArbeit xml:lang="de-DE">Implementation eines Systems zur Validierung von RDF-Dateien</xbd:titelDerArbeit>
        <xbd:noteDerArbeit>
            <xbd:note>1.3</xbd:note>
        </xbd:noteDerArbeit>
        <xbd:urlDerArbeit>http://www.example.com/BachelorArbeit_ErikaMustermann.pdf</xbd:urlDerArbeit>
    </xhs:abschlussarbeit>
    
    <!-- Angaben zum Zugang zu einem weiterführendem Studium -->  
    <xhs:zugangsberechtigungWeiterfuehrendesStudiumBezeichnung xml:lang="de-DE">Master</xhs:zugangsberechtigungWeiterfuehrendesStudiumBezeichnung>
    <xhs:zugangsberechtigungWeiterfuehrendesStudiumCode listURI="urn:xbildung-de:unesco:codeliste:isced2011" listVersionID="ISCED-2011">
        <code>747</code>
    </xhs:zugangsberechtigungWeiterfuehrendesStudiumCode>
</xhs:hochschulabschlusszeugnis>
'
`;
export default myMultiLineString;

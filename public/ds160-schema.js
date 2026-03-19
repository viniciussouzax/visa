/**
 * DS-160 SCHEMA — Fonte única de verdade
 * 
 * ⚠️  GERADO AUTOMATICAMENTE por scripts/build-schema.js
 *     NÃO EDITE MANUALMENTE — edite os módulos em pages/XX/schema.js
 * 
 * Tipos suportados: text, select, radio, date, phone, email, textarea, array
 * Modificadores: required, maxLen, noSpecial, uppercase, allowNA, allowUnknown, showWhen, default
 */
const DS160_SCHEMA = {
    sections: [
        {
            id: "location",
            label: "Local da Entrevista",
            fields: [
                {
                    id: "location",
                    label: "Selecione o local onde você solicitará este visto.",
                    type: "select",
                    required: true,
                    ds160: "ddlLocation",
                    options: [
                        { value: "BRA", label: "BRAZIL, BRASILIA" },
                        { value: "PTA", label: "BRAZIL, PORTO ALEGRE" },
                        { value: "RCF", label: "BRAZIL, RECIFE" },
                        { value: "RDJ", label: "BRAZIL, RIO DE JANEIRO" },
                        { value: "SPL", label: "BRAZIL, SAO PAULO" },
                        { value: "", label: "────────────────────", disabled: true },
                        { value: "TIA", label: "ALBANIA, TIRANA" },
                        { value: "ALG", label: "ALGERIA, ALGIERS" },
                        { value: "LUA", label: "ANGOLA, LUANDA" },
                        { value: "BNS", label: "ARGENTINA, BUENOS AIRES" },
                        { value: "YRV", label: "ARMENIA, YEREVAN" },
                        { value: "MLB", label: "AUSTRALIA, MELBOURNE" },
                        { value: "PRT", label: "AUSTRALIA, PERTH" },
                        { value: "SYD", label: "AUSTRALIA, SYDNEY" },
                        { value: "VNN", label: "AUSTRIA, VIENNA" },
                        { value: "BKU", label: "AZERBAIJAN, BAKU" },
                        { value: "NSS", label: "BAHAMAS, NASSAU" },
                        { value: "MNA", label: "BAHRAIN, MANAMA" },
                        { value: "DHK", label: "BANGLADESH, DHAKA" },
                        { value: "BGN", label: "BARBADOS, BRIDGETOWN" },
                        { value: "BRS", label: "BELGIUM, BRUSSELS" },
                        { value: "BLZ", label: "BELIZE, BELMOPAN" },
                        { value: "COT", label: "BENIN, COTONOU" },
                        { value: "HML", label: "BERMUDA, HAMILTON" },
                        { value: "LPZ", label: "BOLIVIA, LA PAZ" },
                        { value: "SAR", label: "BOSNIA-HERZEGOVINA, SARAJEVO" },
                        { value: "GAB", label: "BOTSWANA, GABORONE" },
                        { value: "BSB", label: "BRUNEI, BANDAR SERI BEGAWAN" },
                        { value: "SOF", label: "BULGARIA, SOFIA" },
                        { value: "OUG", label: "BURKINA FASO, OUAGADOUGOU" },
                        { value: "RNG", label: "BURMA, RANGOON" },
                        { value: "BUJ", label: "BURUNDI, BUJUMBURA" },
                        { value: "PIA", label: "CABO VERDE, PRAIA" },
                        { value: "PHP", label: "CAMBODIA, PHNOM PENH" },
                        { value: "YDE", label: "CAMEROON, YAOUNDE" },
                        { value: "CLG", label: "CANADA, CALGARY" },
                        { value: "HLF", label: "CANADA, HALIFAX" },
                        { value: "MTL", label: "CANADA, MONTREAL" },
                        { value: "OTT", label: "CANADA, OTTAWA" },
                        { value: "QBC", label: "CANADA, QUEBEC" },
                        { value: "TRT", label: "CANADA, TORONTO" },
                        { value: "VAC", label: "CANADA, VANCOUVER" },
                        { value: "NDJ", label: "CHAD, N'DJAMENA" },
                        { value: "SNT", label: "CHILE, SANTIAGO" },
                        { value: "BEJ", label: "CHINA, BEIJING" },
                        { value: "GUZ", label: "CHINA, GUANGZHOU" },
                        { value: "SHG", label: "CHINA, SHANGHAI" },
                        { value: "SNY", label: "CHINA, SHENYANG" },
                        { value: "WUH", label: "CHINA, WUHAN" },
                        { value: "BGT", label: "COLOMBIA, BOGOTA" },
                        { value: "BRZ", label: "CONGO, BRAZZAVILLE" },
                        { value: "KIN", label: "CONGO, KINSHASA" },
                        { value: "SNJ", label: "COSTA RICA, SAN JOSE" },
                        { value: "ABJ", label: "COTE D'IVORIE, ABIDJAN" },
                        { value: "ZGB", label: "CROATIA, ZAGREB" },
                        { value: "HAV", label: "CUBA, HAVANA" },
                        { value: "CRC", label: "CURACAO, CURACAO" },
                        { value: "NCS", label: "CYPRUS, NICOSIA" },
                        { value: "PRG", label: "CZECH REPUBLIC, PRAGUE" },
                        { value: "CPN", label: "DENMARK, COPENHAGEN" },
                        { value: "DJI", label: "DJIBOUTI, DJIBOUTI" },
                        { value: "SDO", label: "DOMINICAN REPUBLIC, SANTO DOMINGO" },
                        { value: "GYQ", label: "ECUADOR, GUAYAQUIL" },
                        { value: "QTO", label: "ECUADOR, QUITO" },
                        { value: "CRO", label: "EGYPT, CAIRO" },
                        { value: "SNS", label: "EL SALVADOR, SAN SALVADOR" },
                        { value: "LND", label: "ENGLAND, LONDON" },
                        { value: "MBO", label: "EQUATORIAL GUINEA, MALABO" },
                        { value: "ASM", label: "ERITREA, ASMARA" },
                        { value: "TAL", label: "ESTONIA, TALLINN" },
                        { value: "MBA", label: "ESWATINI, MBABANE" },
                        { value: "ADD", label: "ETHIOPIA, ADDIS ABABA" },
                        { value: "SUV", label: "FIJI, SUVA" },
                        { value: "HLS", label: "FINLAND, HELSINKI" },
                        { value: "PRS", label: "FRANCE, PARIS" },
                        { value: "LIB", label: "GABON, LIBREVILLE" },
                        { value: "BAN", label: "GAMBIA, BANJUL" },
                        { value: "TBL", label: "GEORGIA, TBILISI" },
                        { value: "BRL", label: "GERMANY, BERLIN" },
                        { value: "FRN", label: "GERMANY, FRANKFURT" },
                        { value: "MUN", label: "GERMANY, MUNICH" },
                        { value: "ACC", label: "GHANA, ACCRA" },
                        { value: "ATH", label: "GREECE, ATHENS" },
                        { value: "GTM", label: "GUATEMALA, GUATEMALA CITY" },
                        { value: "CRY", label: "GUINEA, CONAKRY" },
                        { value: "GEO", label: "GUYANA, GEORGETOWN" },
                        { value: "PTP", label: "HAITI, PORT-AU-PRINCE" },
                        { value: "TGG", label: "HONDURAS, TEGUCIGALPA" },
                        { value: "HNK", label: "HONG KONG" },
                        { value: "BDP", label: "HUNGARY, BUDAPEST" },
                        { value: "RKJ", label: "ICELAND, REYKJAVIK" },
                        { value: "MDR", label: "INDIA, CHENNAI" },
                        { value: "HYD", label: "INDIA, HYDERABAD" },
                        { value: "CLC", label: "INDIA, KOLKATA" },
                        { value: "BMB", label: "INDIA, MUMBAI" },
                        { value: "NWD", label: "INDIA, NEW DELHI" },
                        { value: "JAK", label: "INDONESIA, JAKARTA" },
                        { value: "SRB", label: "INDONESIA, SURABAYA" },
                        { value: "BGH", label: "IRAQ, BAGHDAD" },
                        { value: "ERB", label: "IRAQ, ERBIL" },
                        { value: "DBL", label: "IRELAND, DUBLIN" },
                        { value: "TLV", label: "ISRAEL, TEL AVIV" },
                        { value: "FLR", label: "ITALY, FLORENCE" },
                        { value: "MLN", label: "ITALY, MILAN" },
                        { value: "NPL", label: "ITALY, NAPLES" },
                        { value: "RME", label: "ITALY, ROME" },
                        { value: "KNG", label: "JAMAICA, KINGSTON" },
                        { value: "NHA", label: "JAPAN, NAHA" },
                        { value: "KBO", label: "JAPAN, OSAKA/FUKUOKA" },
                        { value: "TKY", label: "JAPAN, TOKYO/SAPPORO" },
                        { value: "JRS", label: "JERUSALEM" },
                        { value: "AMM", label: "JORDAN, AMMAN" },
                        { value: "ATA", label: "KAZAKHSTAN, ALMATY" },
                        { value: "AST", label: "KAZAKHSTAN, ASTANA" },
                        { value: "NRB", label: "KENYA, NAIROBI" },
                        { value: "PRI", label: "KOSOVO, PRISTINA" },
                        { value: "KWT", label: "KUWAIT, KUWAIT CITY" },
                        { value: "BKK", label: "KYRGYZSTAN, BISHKEK" },
                        { value: "VNT", label: "LAOS, VIENTIANE" },
                        { value: "RGA", label: "LATVIA, RIGA" },
                        { value: "BRT", label: "LEBANON, BEIRUT" },
                        { value: "MAS", label: "LESOTHO, MASERU" },
                        { value: "MRV", label: "LIBERIA, MONROVIA" },
                        { value: "VIL", label: "LITHUANIA, VILNIUS" },
                        { value: "LXM", label: "LUXEMBOURG, LUXEMBOURG" },
                        { value: "ANT", label: "MADAGASCAR, ANTANANARIVO" },
                        { value: "LIL", label: "MALAWI, LILONGWE" },
                        { value: "KLL", label: "MALAYSIA, KUALA LUMPUR" },
                        { value: "BAM", label: "MALI, BAMAKO" },
                        { value: "VLL", label: "MALTA, VALLETTA" },
                        { value: "MAJ", label: "MARSHALL ISLANDS, MAJURO" },
                        { value: "NUK", label: "MAURITANIA, NOUAKCHOTT" },
                        { value: "PTL", label: "MAURITIUS, PORT LOUIS" },
                        { value: "CDJ", label: "MEXICO, CIUDAD JUAREZ" },
                        { value: "GDL", label: "MEXICO, GUADALAJARA" },
                        { value: "HER", label: "MEXICO, HERMOSILLO" },
                        { value: "MTM", label: "MEXICO, MATAMOROS" },
                        { value: "MER", label: "MEXICO, MERIDA" },
                        { value: "MEX", label: "MEXICO, MEXICO CITY" },
                        { value: "MTR", label: "MEXICO, MONTERREY" },
                        { value: "NGL", label: "MEXICO, NOGALES" },
                        { value: "NVL", label: "MEXICO, NUEVO LAREDO" },
                        { value: "TJT", label: "MEXICO, TIJUANA" },
                        { value: "KOL", label: "MICRONESIA, KOLONIA" },
                        { value: "CHS", label: "MOLDOVA, CHISINAU" },
                        { value: "ULN", label: "MONGOLIA, ULAANBAATAR" },
                        { value: "POD", label: "MONTENEGRO, PODGORICA" },
                        { value: "CSB", label: "MOROCCO, CASABLANCA" },
                        { value: "MAP", label: "MOZAMBIQUE, MAPUTO" },
                        { value: "WHK", label: "NAMIBIA, WINDHOEK" },
                        { value: "KDU", label: "NEPAL, KATHMANDU" },
                        { value: "AMS", label: "NETHERLANDS, AMSTERDAM" },
                        { value: "ACK", label: "NEW ZEALAND, AUCKLAND" },
                        { value: "MNG", label: "NICARAGUA, MANAGUA" },
                        { value: "NMY", label: "NIGER, NIAMEY" },
                        { value: "ABU", label: "NIGERIA, ABUJA" },
                        { value: "LGS", label: "NIGERIA, LAGOS" },
                        { value: "SKO", label: "NORTH MACEDONIA, SKOPJE" },
                        { value: "BLF", label: "NORTHERN IRELAND, BELFAST" },
                        { value: "OSL", label: "NORWAY, OSLO" },
                        { value: "MST", label: "OMAN, MUSCAT" },
                        { value: "ISL", label: "PAKISTAN, ISLAMABAD" },
                        { value: "KRC", label: "PAKISTAN, KARACHI" },
                        { value: "KOR", label: "PALAU, KOROR" },
                        { value: "PNM", label: "PANAMA, PANAMA CITY" },
                        { value: "PTM", label: "PAPUA NEW GUINEA, PORT MORESBY" },
                        { value: "ASN", label: "PARAGUAY, ASUNCION" },
                        { value: "LMA", label: "PERU, LIMA" },
                        { value: "MNL", label: "PHILIPPINES, MANILA" },
                        { value: "KRK", label: "POLAND, KRAKOW" },
                        { value: "WRW", label: "POLAND, WARSAW" },
                        { value: "LSB", label: "PORTUGAL, LISBON" },
                        { value: "DOH", label: "QATAR, DOHA" },
                        { value: "BCH", label: "ROMANIA, BUCHAREST" },
                        { value: "MOS", label: "RUSSIA, MOSCOW" },
                        { value: "KGL", label: "RWANDA, KIGALI" },
                        { value: "APA", label: "SAMOA, APIA" },
                        { value: "DHR", label: "SAUDI ARABIA, DHAHRAN" },
                        { value: "JDD", label: "SAUDI ARABIA, JEDDAH" },
                        { value: "RID", label: "SAUDI ARABIA, RIYADH" },
                        { value: "DKR", label: "SENEGAL, DAKAR" },
                        { value: "BLG", label: "SERBIA, BELGRADE" },
                        { value: "FTN", label: "SIERRA LEONE, FREETOWN" },
                        { value: "SGP", label: "SINGAPORE, SINGAPORE" },
                        { value: "BTS", label: "SLOVAKIA, BRATISLAVA" },
                        { value: "LJU", label: "SLOVENIA, LJUBLJANA" },
                        { value: "CPT", label: "SOUTH AFRICA, CAPE TOWN" },
                        { value: "DRB", label: "SOUTH AFRICA, DURBAN" },
                        { value: "JHN", label: "SOUTH AFRICA, JOHANNESBURG" },
                        { value: "SEO", label: "SOUTH KOREA, SEOUL" },
                        { value: "JBA", label: "SOUTH SUDAN, JUBA" },
                        { value: "MDD", label: "SPAIN, MADRID" },
                        { value: "CLM", label: "SRI LANKA, COLOMBO" },
                        { value: "PRM", label: "SURINAME, PARAMARIBO" },
                        { value: "STK", label: "SWEDEN, STOCKHOLM" },
                        { value: "BEN", label: "SWITZERLAND, BERN" },
                        { value: "TAI", label: "TAIWAN, TAIPEI" },
                        { value: "DHB", label: "TAJIKISTAN, DUSHANBE" },
                        { value: "DRS", label: "TANZANIA, DAR ES SALAAM" },
                        { value: "BNK", label: "THAILAND, BANGKOK" },
                        { value: "CHN", label: "THAILAND, CHIANG MAI" },
                        { value: "DIL", label: "TIMOR LESTE, DILI" },
                        { value: "LOM", label: "TOGO, LOME" },
                        { value: "PTS", label: "TRINIDAD, PORT OF SPAIN" },
                        { value: "TNS", label: "TUNISIA, TUNIS" },
                        { value: "ANK", label: "TURKEY, ANKARA" },
                        { value: "IST", label: "TURKEY, ISTANBUL" },
                        { value: "AKD", label: "TURKMENISTAN, ASHGABAT" },
                        { value: "KMP", label: "UGANDA, KAMPALA" },
                        { value: "KEV", label: "UKRAINE, KYIV" },
                        { value: "ABD", label: "UNITED ARAB EMIRATES, ABU DHABI" },
                        { value: "DUB", label: "UNITED ARAB EMIRATES, DUBAI" },
                        { value: "MTV", label: "URUGUAY, MONTEVIDEO" },
                        { value: "THT", label: "UZBEKISTAN, TASHKENT" },
                        { value: "HAN", label: "VIETNAM, HANOI" },
                        { value: "HCM", label: "VIETNAM, HO CHI MINH CITY" },
                        { value: "LUS", label: "ZAMBIA, LUSAKA" },
                        { value: "HRE", label: "ZIMBABWE, HARARE" }
                    ]
                },
                {
                    id: "locationPhotoWarning",
                    type: "alert",
                    alertStyle: "warning",
                    label: "Para essa localidade exigirá que você carregue uma foto digital sua antes, um de nossos assessores vai falar com você em um segundo momento.",
                    showWhen: {
                        field: "location",
                        in: ["PTA", "RCF"]
                    }
                }
            ]
        },
        {
            id: "personal1",
            label: "Informações Pessoais 1",
            fields: [
                {
                    id: "givenName",
                    label: "Nome",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    ds160: "tbxAPP_GIVEN_NAME",
                    hint: "Se o passaporte não tiver nome, insira \"FNU\"."
                },
                {
                    id: "surname",
                    label: "Sobrenome",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    ds160: "tbxAPP_SURNAME",
                    hint: "Insira todos os sobrenomes conforme consta no passaporte."
                },
                {
                    id: "fullNameNative",
                    label: "Nome completo no alfabeto nativo",
                    type: "text",
                    required: true,
                    maxLen: 100,
                    allowNA: true,
                    ds160: "tbxAPP_FULL_NAME_NATIVE",
                    hint: "Escreva seu nome completo no alfabeto do seu país."
                },
                {
                    id: "otherNamesUsed",
                    label: "Já usou outros nomes?",
                    type: "radio",
                    required: true,
                    ds160: "rblOtherNames",
                    hint: "Inclui nome de solteiro(a), nome religioso, profissional, apelido ou qualquer outro nome pelo qual você é ou foi conhecido(a)."
                },
                {
                    id: "otherNames",
                    label: "Outros nomes",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "otherNamesUsed", equals: "Y" },
                    ds160List: "DListAlias",
                    fields: [
                        {
                            id: "givenName",
                            label: "Nome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxGIVEN_NAME"
                        },
                        {
                            id: "surname",
                            label: "Sobrenome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxSURNAME"
                        }
                    ]
                },
                {
                    id: "telecode",
                    label: "Possui telecode?",
                    type: "radio",
                    required: true,
                    ds160: "rblTelecodeQuestion",
                    hint: "Telecodes são códigos numéricos de 4 dígitos que representam caracteres em nomes com alfabeto não-romano. Se não souber, selecione Não."
                },
                {
                    id: "telecodeGivenName",
                    label: "Telecode do Nome",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    groupLabel: "Resposta",
                    showWhen: { field: "telecode", equals: "Y" },
                    ds160: "tbxAPP_TelecodeGIVEN_NAME"
                },
                {
                    id: "telecodeSurname",
                    label: "Telecode do Sobrenome",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    showWhen: { field: "telecode", equals: "Y" },
                    ds160: "tbxAPP_TelecodeSURNAME"
                },
                {
                    id: "sex",
                    label: "Sexo",
                    type: "select",
                    required: true,
                    ds160: "ddlAPP_GENDER",
                    options: [
                        { value: "M", label: "Masculino" },
                        { value: "F", label: "Feminino" }
                    ]
                },
                {
                    id: "maritalStatus",
                    label: "Estado Civil",
                    type: "select",
                    required: true,
                    ds160: "ddlAPP_MARITAL_STATUS",
                    options: [
                        { value: "M", label: "Casado(a)" },
                        { value: "C", label: "União Estável" },
                        { value: "P", label: "União Civil/Parceria Doméstica" },
                        { value: "S", label: "Solteiro(a)" },
                        { value: "W", label: "Viúvo(a)" },
                        { value: "D", label: "Divorciado(a)" },
                        { value: "L", label: "Separado(a) Legalmente" },
                        { value: "O", label: "Outro" }
                    ],
                    optionHints: {
                        M: "Casamento civil formalizado legalmente.",
                        C: "Relação em que o casal vive como casado, sem casamento civil formal.",
                        P: "União registrada legalmente entre duas pessoas, semelhante ao casamento.",
                        S: "Pessoa que nunca se casou.",
                        W: "Pessoa cujo cônjuge faleceu.",
                        D: "Casamento encerrado oficialmente por divórcio.",
                        L: "Casamento ainda existente legalmente, mas com separação reconhecida pela justiça.",
                        O: "Situação civil diferente das opções listadas."
                    }
                },
                {
                    id: "otherMaritalStatusText",
                    label: "Especifique estado civil",
                    type: "textarea",
                    required: true,
                    maxLen: 200,
                    showWhen: { field: "maritalStatus", equals: "O" },
                    ds160: "tbxOtherMaritalStatus"
                },
                {
                    id: "dob",
                    label: "Data de Nascimento",
                    type: "date",
                    required: true,
                    notFuture: true,
                    ds160day: "ddlDOBDay",
                    ds160month: "ddlDOBMonth",
                    ds160year: "tbxDOBYear",
                    hint: "Formato: DD-MMM-AAAA. Se dia ou mês desconhecido, insira conforme consta no passaporte."
                },
                {
                    id: "cityOfBirth",
                    label: "Cidade de Nascimento",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    noSpecial: true,
                    ds160: "tbxAPP_POB_CITY"
                },
                {
                    id: "stateOfBirth",
                    label: "Estado/Província de Nascimento",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    noSpecial: true,
                    allowNA: true,
                    ds160: "tbxAPP_POB_ST_PROVINCE"
                },
                {
                    id: "countryOfBirth",
                    label: "País de Nascimento",
                    type: "select",
                    required: true,
                    ds160: "ddlAPP_POB_CNTRY",
                    optionsRef: "countries",
                    default: "BRZL",
                    hint: "Selecione o nome atualmente usado para o local onde você nasceu."
                }
            ]
        },
        {
            id: "personal2",
            label: "Informações Pessoais 2",
            fields: [
                {
                    id: "nationality",
                    label: "Nacionalidade",
                    type: "select",
                    required: true,
                    ds160: "ddlAPP_NATL",
                    optionsRef: "countries"
                },
                {
                    id: "otherNationality",
                    label: "Possui outra nacionalidade?",
                    type: "radio",
                    required: true,
                    ds160: "rblAPP_OTH_NATL_IND",
                    hint: "Informe todas as nacionalidades que possui atualmente e todas que já possuiu, independente de ter renunciado formalmente ou não."
                },
                {
                    id: "otherNationalities",
                    label: "Outras nacionalidades",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "otherNationality", equals: "Y" },
                    ds160List: "dtlOTHER_NATL",
                    fields: [
                        {
                            id: "country",
                            label: "País",
                            type: "select",
                            required: true,
                            fullWidth: true,
                            ds160: "ddlOTHER_NATL",
                            optionsRef: "countries",
                            excludeField: "nationality"
                        },
                        {
                            id: "hasPassport",
                            label: "Possui passaporte desse país?",
                            type: "radio",
                            required: true,
                            fullWidth: true,
                            ds160: "rblOTHER_PPT_IND"
                        },
                        {
                            id: "passportNumber",
                            label: "Número do passaporte",
                            type: "text",
                            required: true,
                            maxLen: 20,
                            showWhen: { field: "hasPassport", equals: "Y" },
                            ds160: "tbxOTHER_PPT_NUM"
                        }
                    ]
                },
                {
                    id: "permanentResident",
                    label: "É residente permanente de outro país?",
                    type: "radio",
                    required: true,
                    ds160: "rblPermResOtherCntryInd",
                    hint: "Residente permanente é qualquer pessoa que recebeu de um país permissão legal para viver e trabalhar sem limitação de tempo naquele país."
                },
                {
                    id: "permanentResidentCountries",
                    label: "Países de residência permanente",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "permanentResident", equals: "Y" },
                    ds160List: "dtlOthPermResCntry",
                    fields: [
                        {
                            id: "country",
                            label: "País",
                            type: "select",
                            required: true,
                            ds160: "ddlOthPermResCntry",
                            optionsRef: "countries",
                            excludeField: "nationality"
                        }
                    ]
                },
                {
                    id: "nationalId",
                    label: "Identidade Nacional / CPF",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    allowNA: true,
                    ds160: "tbxAPP_NATIONAL_ID",
                    hint: "Número único fornecido pelo seu governo (ex: CPF para brasileiros). Marque 'Não se Aplica' se não possuir."
                },
                {
                    id: "ssn",
                    label: "Número do Seguro Social (SSN) dos EUA",
                    type: "ssn",
                    required: true,
                    allowNA: true,
                    ds160p1: "tbxAPP_SSN1",
                    ds160p2: "tbxAPP_SSN2",
                    ds160p3: "tbxAPP_SSN3",
                    hint: "Formato: XXX-XX-XXXX. Apenas se já possuiu ou possui SSN americano."
                },
                {
                    id: "taxId",
                    label: "Número de Contribuinte dos EUA",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    allowNA: true,
                    ds160: "tbxAPP_TAX_ID",
                    hint: "Apenas se já possuiu ou possui número de contribuinte (ITIN/EIN) nos EUA."
                }
            ]
        },
        {
            id: "travel",
            label: "Viagem",
            fields: [
                {
                    id: "purposeCategory",
                    label: "Categoria do Visto",
                    type: "select",
                    required: true,
                    ds160: "ddlPurposeOfTrip",
                    options: [
                        { value: "B", label: "B - Negócios / Turismo" },
                        { value: "F", label: "F - Estudante" },
                        { value: "J", label: "J - Intercâmbio" },
                        { value: "O", label: "O - Habilidade Extraordinária" }
                    ]
                },
                {
                    id: "purposeOfTrip",
                    label: "Tipo de Visto Específico",
                    type: "select",
                    required: true,
                    ds160: "ddlOtherPurpose",
                    filteredBy: { field: "purposeCategory" },
                    options: [
                        { value: "B1/B2", label: "B1/B2 - Negócios e Turismo", group: "B" },
                        { value: "B1", label: "B1 - Negócios/Conferência", group: "B" },
                        { value: "B2", label: "B2 - Turismo/Tratamento Médico", group: "B" },
                        { value: "F1", label: "F1 - Estudante", group: "F" },
                        { value: "F2", label: "F2 - Cônjuge/Filho de F1", group: "F" },
                        { value: "J1", label: "J1 - Visitante de Intercâmbio", group: "J" },
                        { value: "J2", label: "J2 - Cônjuge/Filho de J1", group: "J" },
                        { value: "H1B", label: "H-1B - Ocupação Especializada", group: "H" },
                        { value: "H1B1", label: "H-1B1 - Free Trade (Chile/Singapura)", group: "H" },
                        { value: "H2A", label: "H-2A - Trabalhador Agrícola", group: "H" },
                        { value: "H2B", label: "H-2B - Trabalhador Não-Agrícola", group: "H" },
                        { value: "H3", label: "H-3 - Trainee", group: "H" },
                        { value: "H4", label: "H-4 - Cônjuge/Filho de H", group: "H" },
                        { value: "C1", label: "C1 - Trânsito", group: "C" },
                        { value: "C1/D", label: "C1/D - Tripulante em Trânsito", group: "C" },
                        { value: "C2", label: "C2 - Trânsito para ONU", group: "C" },
                        { value: "C3", label: "C3 - Oficial Estrangeiro em Trânsito", group: "C" },
                        { value: "CW1", label: "CW-1 - Trabalhador Transicional CNMI", group: "CW" },
                        { value: "CW2", label: "CW-2 - Cônjuge/Filho de CW1", group: "CW" },
                        { value: "D", label: "D - Tripulante", group: "D" },
                        { value: "E1", label: "E-1 - Comerciante por Tratado", group: "E" },
                        { value: "E2", label: "E-2 - Investidor por Tratado", group: "E" },
                        { value: "E3", label: "E-3 - Trabalhador Australiano", group: "E" },
                        { value: "I", label: "I - Representante de Mídia", group: "I" },
                        { value: "K1", label: "K-1 - Noivo(a) de Cidadão Americano", group: "K" },
                        { value: "K2", label: "K-2 - Filho de K1", group: "K" },
                        { value: "K3", label: "K-3 - Cônjuge de Cidadão Americano", group: "K" },
                        { value: "K4", label: "K-4 - Filho de K3", group: "K" },
                        { value: "L1", label: "L-1 - Transferência Intraempresa", group: "L" },
                        { value: "L2", label: "L-2 - Cônjuge/Filho de L1", group: "L" },
                        { value: "M1", label: "M-1 - Estudante Vocacional", group: "M" },
                        { value: "M2", label: "M-2 - Cônjuge/Filho de M1", group: "M" },
                        { value: "O1", label: "O-1 - Habilidade Extraordinária", group: "O" },
                        { value: "O2", label: "O-2 - Assistente de O1", group: "O" },
                        { value: "O3", label: "O-3 - Cônjuge/Filho de O1/O2", group: "O" },
                        { value: "P1", label: "P-1 - Atleta/Artista Individual", group: "P" },
                        { value: "P2", label: "P-2 - Artista de Intercâmbio", group: "P" },
                        { value: "P3", label: "P-3 - Artista Culturalmente Único", group: "P" },
                        { value: "P4", label: "P-4 - Cônjuge/Filho de P", group: "P" },
                        { value: "Q1", label: "Q-1 - Intercâmbio Cultural", group: "Q" },
                        { value: "R1", label: "R-1 - Trabalhador Religioso", group: "R" },
                        { value: "R2", label: "R-2 - Cônjuge/Filho de R1", group: "R" },
                        { value: "TN", label: "TN - Profissional NAFTA", group: "TD" },
                        { value: "TD", label: "TD - Cônjuge/Filho de TN", group: "TD" },
                        { value: "T1", label: "T-1 - Vítima de Tráfico", group: "T" },
                        { value: "T2", label: "T-2 - Cônjuge de T1", group: "T" },
                        { value: "T3", label: "T-3 - Filho de T1", group: "T" },
                        { value: "U1", label: "U-1 - Vítima de Crime", group: "U" },
                        { value: "U2", label: "U-2 - Cônjuge de U1", group: "U" },
                        { value: "U3", label: "U-3 - Filho de U1", group: "U" },
                        { value: "OTHER", label: "Outro", group: "OTHER" }
                    ]
                },
                {
                    id: "hasSpecificPlans",
                    label: "Possui planos específicos de viagem?",
                    type: "radio",
                    required: true,
                    ds160: "rblSpecificTravel",
                    hint: "Se já tem datas, voos e locais definidos, selecione Sim. Caso contrário, selecione Não e informe uma estimativa."
                },
                {
                    id: "arrivalDate",
                    label: "Data de Chegada",
                    type: "date",
                    required: true,
                    fullWidth: true,
                    showWhen: { field: "hasSpecificPlans", equals: "Y" },
                    ds160day: "ddlARRIVAL_US_DTEDay",
                    ds160month: "ddlARRIVAL_US_DTEMonth",
                    ds160year: "tbxARRIVAL_US_DTEYear"
                },
                {
                    id: "arrivalFlight",
                    label: "Voo de Chegada",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    fullWidth: true,
                    showWhen: { field: "hasSpecificPlans", equals: "Y" },
                    ds160: "tbxArriveFlight"
                },
                {
                    id: "arrivalCity",
                    label: "Cidade de Chegada",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    fullWidth: true,
                    showWhen: { field: "hasSpecificPlans", equals: "Y" },
                    ds160: "tbxArriveCity"
                },
                {
                    id: "departureDate",
                    label: "Data de Partida",
                    type: "date",
                    required: true,
                    fullWidth: true,
                    showWhen: { field: "hasSpecificPlans", equals: "Y" },
                    ds160day: "ddlDEPARTURE_US_DTEDay",
                    ds160month: "ddlDEPARTURE_US_DTEMonth",
                    ds160year: "tbxDEPARTURE_US_DTEYear"
                },
                {
                    id: "departureFlight",
                    label: "Voo de Partida",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    fullWidth: true,
                    showWhen: { field: "hasSpecificPlans", equals: "Y" },
                    ds160: "tbxDepartFlight"
                },
                {
                    id: "departureCity",
                    label: "Cidade de Partida",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    fullWidth: true,
                    showWhen: { field: "hasSpecificPlans", equals: "Y" },
                    ds160: "tbxDepartCity"
                },
                {
                    id: "specificLocations",
                    label: "Locais nos EUA",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "hasSpecificPlans", equals: "Y" },
                    ds160List: "dtlTravelLoc",
                    fields: [
                        {
                            id: "location",
                            label: "Local",
                            type: "text",
                            required: true,
                            maxLen: 40,
                            ds160: "tbxSPECTRAVEL_LOCATION"
                        }
                    ]
                },
                {
                    id: "nonSpecificArrival",
                    label: "Data prevista de chegada",
                    type: "date",
                    required: true,
                    fullWidth: true,
                    showWhen: { field: "hasSpecificPlans", equals: "N" },
                    ds160day: "ddlARRIVAL_US_NSDTEDay",
                    ds160month: "ddlARRIVAL_US_NSDTEMonth",
                    ds160year: "tbxARRIVAL_US_NSDTEYear"
                },
                {
                    id: "lengthOfStay",
                    label: "Tempo de permanência",
                    type: "text",
                    required: true,
                    maxLen: 3,
                    inline: true,
                    flexBasis: "100px",
                    showWhen: { field: "hasSpecificPlans", equals: "N" },
                    ds160: "tbxAPP_LOS"
                },
                {
                    id: "lengthOfStayUnit",
                    label: "Unidade",
                    type: "select",
                    required: true,
                    inline: true,
                    flexBasis: "300px",
                    showWhen: { field: "hasSpecificPlans", equals: "N" },
                    ds160: "ddlAPP_LOS_CD",
                    options: [
                        { value: "Y", label: "Anos" },
                        { value: "M", label: "Meses" },
                        { value: "W", label: "Semanas" },
                        { value: "D", label: "Dias" },
                        { value: "H", label: "Menos de 24 horas" }
                    ]
                },
                { id: "usAddressHeading", label: "Qual endereço do local onde você ficará hospedado nos EUA?", type: "heading" },
                {
                    id: "usAddressStreet1",
                    label: "Endereço nos EUA - Linha 1",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    ds160: "tbxStreetAddress1"
                },
                {
                    id: "usAddressStreet2",
                    label: "Endereço nos EUA - Linha 2",
                    type: "text",
                    maxLen: 40,
                    ds160: "tbxStreetAddress2"
                },
                {
                    id: "usAddressCity",
                    label: "Cidade nos EUA",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    ds160: "tbxCity"
                },
                {
                    id: "usAddressState",
                    label: "Estado nos EUA",
                    type: "select",
                    required: true,
                    ds160: "ddlTravelState",
                    optionsRef: "usStates"
                },
                {
                    id: "usAddressZip",
                    label: "CEP nos EUA",
                    type: "text",
                    required: true,
                    maxLen: 10,
                    ds160: "tbZIPCode"
                },
                {
                    id: "whoIsPaying",
                    label: "Quem paga a viagem?",
                    type: "select",
                    required: true,
                    ds160: "ddlWhoIsPaying",
                    hint: "Selecione quem irá custear os gastos da viagem aos EUA.",
                    options: [
                        { value: "S", label: "O próprio solicitante" },
                        { value: "O", label: "Outra pessoa" },
                        { value: "P", label: "Empregador atual" },
                        { value: "U", label: "Empregador nos EUA" },
                        { value: "C", label: "Outra companhia/organização" }
                    ]
                },
                {
                    id: "payerSurname",
                    label: "Sobrenome do pagador",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "O" },
                    ds160: "tbxPayerSurname"
                },
                {
                    id: "payerGivenName",
                    label: "Nome do pagador",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "O" },
                    ds160: "tbxPayerGivenName"
                },
                {
                    id: "payerPhone",
                    label: "Telefone do pagador",
                    type: "phone",
                    required: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "O" },
                    ds160: "tbxPayerPhone"
                },
                {
                    id: "payerEmail",
                    label: "Email do pagador",
                    type: "email",
                    required: true,
                    maxLen: 50,
                    allowNA: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "O" },
                    ds160: "tbxPAYER_EMAIL_ADDR",
                    hint: "Marque 'Não se Aplica' se não souber o email."
                },
                {
                    id: "payerRelationship",
                    label: "Relação com o pagador",
                    type: "select",
                    required: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "O" },
                    ds160: "ddlPayerRelationship",
                    options: [
                        { value: "C", label: "Filho(a)" },
                        { value: "P", label: "Pais" },
                        { value: "S", label: "Cônjuge" },
                        { value: "R", label: "Outro parente" },
                        { value: "F", label: "Amigo" },
                        { value: "O", label: "Outro" }
                    ]
                },
                {
                    id: "payerSameAddress",
                    label: "O endereço do pagador é o mesmo que seu endereço residencial ou de correspondência?",
                    type: "radio",
                    required: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "O" },
                    ds160: "rblPayerAddrSameAsInd",
                    options: [
                        { value: "Y", label: "Sim" },
                        { value: "N", label: "Não" }
                    ]
                },
                {
                    id: "payerPersonCountry",
                    label: "País/Região do endereço residencial ou de correspondência do Pagador?",
                    type: "select",
                    required: true,
                    fullWidth: true,
                    showWhen: { field: "payerSameAddress", equals: "N" },
                    ds160: "ddlPayerCountry",
                    optionsRef: "countries"
                },
                {
                    id: "payerPersonPostalCode",
                    label: "CEP / Código Postal",
                    type: "text",
                    required: true,
                    maxLen: 10,
                    allowNA: true,
                    fullWidth: true,
                    showWhen: { field: "payerSameAddress", equals: "N" },
                    ds160: "tbxPayerPostalZIPCode",
                    hint: "Digite o CEP para preencher o endereço automaticamente."
                },
                {
                    id: "payerPersonStreet1",
                    label: "Endereço do Pagador (Linha 1)",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    fullWidth: true,
                    showWhen: { field: "payerSameAddress", equals: "N" },
                    ds160: "tbxPayerStreetAddress1"
                },
                {
                    id: "payerPersonStreet2",
                    label: "Endereço do Pagador (Linha 2)",
                    type: "text",
                    maxLen: 40,
                    fullWidth: true,
                    showWhen: { field: "payerSameAddress", equals: "N" },
                    ds160: "tbxPayerStreetAddress2",
                    hint: "Opcional"
                },
                {
                    id: "payerPersonCity",
                    label: "Cidade do Pagador",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    fullWidth: true,
                    showWhen: { field: "payerSameAddress", equals: "N" },
                    ds160: "tbxPayerCity"
                },
                {
                    id: "payerPersonState",
                    label: "Estado/Província do Pagador",
                    type: "text",
                    maxLen: 20,
                    allowNA: true,
                    fullWidth: true,
                    showWhen: { field: "payerSameAddress", equals: "N" },
                    ds160: "tbxPayerStateProvince"
                },
                {
                    id: "payerCompanyName",
                    label: "Nome da empresa/organização pagadora",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "C" },
                    ds160: "tbxPayingCompany"
                },
                {
                    id: "payerCompanyPhone",
                    label: "Telefone da empresa",
                    type: "phone",
                    required: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "C" },
                    ds160: "tbxPayerPhone"
                },
                {
                    id: "payerCompanyRelation",
                    label: "Relação com a empresa",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "C" },
                    ds160: "tbxCompanyRelation"
                },
                {
                    id: "payerCoCountry",
                    label: "País/Região do endereço da empresa/organização pagadora",
                    type: "select",
                    required: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "C" },
                    ds160: "ddlPayerCountry",
                    optionsRef: "countries"
                },
                {
                    id: "payerCoPostalCode",
                    label: "CEP / Código Postal",
                    type: "text",
                    required: true,
                    maxLen: 10,
                    allowNA: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "C" },
                    ds160: "tbxPayerPostalZIPCode",
                    hint: "Digite o CEP para preencher o endereço automaticamente."
                },
                {
                    id: "payerCoStreet1",
                    label: "Endereço da Empresa (Linha 1)",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "C" },
                    ds160: "tbxPayerStreetAddress1"
                },
                {
                    id: "payerCoStreet2",
                    label: "Endereço da Empresa (Linha 2)",
                    type: "text",
                    maxLen: 40,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "C" },
                    ds160: "tbxPayerStreetAddress2",
                    hint: "Opcional"
                },
                {
                    id: "payerCoCity",
                    label: "Cidade da Empresa",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "C" },
                    ds160: "tbxPayerCity"
                },
                {
                    id: "payerCoState",
                    label: "Estado/Província da Empresa",
                    type: "text",
                    maxLen: 20,
                    allowNA: true,
                    fullWidth: true,
                    showWhen: { field: "whoIsPaying", equals: "C" },
                    ds160: "tbxPayerStateProvince"
                }
            ]
        },
        {
            id: "travelCompanions",
            label: "Acompanhantes de Viagem",
            fields: [
                {
                    id: "travelingWithOthers",
                    label: "Viaja com outras pessoas?",
                    type: "radio",
                    required: true,
                    ds160: "rblOtherPersonsTravelingWithYou",
                    hint: "Inclua familiares, amigos ou qualquer pessoa que viajará junto com você."
                },
                {
                    id: "partOfGroup",
                    label: "Faz parte de um grupo?",
                    type: "radio",
                    required: true,
                    showWhen: { field: "travelingWithOthers", equals: "Y" },
                    ds160: "rblGroupTravel",
                    hint: "Selecione Sim se estiver viajando como parte de um grupo ou organização."
                },
                {
                    id: "groupName",
                    label: "Nome do grupo",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    showWhen: { field: "partOfGroup", equals: "Y" },
                    ds160: "tbxGroupName",
                    hint: "Informe o nome do grupo com o qual você está viajando."
                },
                {
                    id: "companions",
                    label: "Acompanhantes",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "partOfGroup", equals: "N" },
                    ds160List: "dlTravelCompanions",
                    fields: [
                        {
                            id: "givenName",
                            label: "Nome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxTC_GIVEN_NAME"
                        },
                        {
                            id: "surname",
                            label: "Sobrenome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxTC_SURNAME"
                        },
                        {
                            id: "relationship",
                            label: "Relação",
                            type: "select",
                            required: true,
                            ds160: "ddlTCRelationship",
                            optionsRef: "relationships"
                        }
                    ]
                }
            ]
        },
        {
            id: "previousUSTravel",
            label: "Viagens Anteriores aos EUA",
            fields: [
                {
                    id: "hasBeenInUS",
                    label: "Já esteve nos EUA?",
                    type: "radio",
                    required: true,
                    ds160: "rblPREV_US_TRAVEL_IND",
                    hint: "Informe se já visitou os Estados Unidos em qualquer momento."
                },
                {
                    id: "previousVisits",
                    label: "Visitas anteriores",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "hasBeenInUS", equals: "Y" },
                    ds160List: "dtlPREV_US_VISIT",
                    fields: [
                        {
                            id: "arrivalDate",
                            label: "Data de chegada",
                            type: "date",
                            required: true,
                            fullWidth: true,
                            ds160day: "ddlPREV_US_VISIT_DTEDay",
                            ds160month: "ddlPREV_US_VISIT_DTEMonth",
                            ds160year: "tbxPREV_US_VISIT_DTEYear"
                        },
                        {
                            id: "lengthOfStay",
                            label: "Tempo de permanência",
                            type: "text",
                            required: true,
                            maxLen: 3,
                            flexBasis: "100px",
                            ds160: "tbxPREV_US_VISIT_LOS"
                        },
                        {
                            id: "lengthOfStayUnit",
                            label: "Período",
                            type: "select",
                            required: true,
                            flexBasis: "300px",
                            ds160: "ddlPREV_US_VISIT_LOS_CD",
                            options: [
                                { value: "Y", label: "Anos" },
                                { value: "M", label: "Meses" },
                                { value: "W", label: "Semanas" },
                                { value: "D", label: "Dias" },
                                { value: "H", label: "Menos de 24 horas" }
                            ]
                        }
                    ]
                },
                {
                    id: "hasDriversLicense",
                    label: "Possui ou já possuiu carteira de motorista americana?",
                    type: "radio",
                    required: true,
                    showWhen: { field: "hasBeenInUS", equals: "Y" },
                    ds160: "rblPREV_US_DRIVER_LIC_IND"
                },
                {
                    id: "driversLicenses",
                    label: "Carteiras de motorista",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "hasDriversLicense", equals: "Y" },
                    ds160List: "dtlUS_DRIVER_LICENSE",
                    fields: [
                        {
                            id: "number",
                            label: "Número da carteira",
                            type: "text",
                            required: true,
                            maxLen: 20,
                            allowUnknown: true,
                            ds160: "tbxUS_DRIVER_LICENSE"
                        },
                        {
                            id: "state",
                            label: "Estado emissor",
                            type: "select",
                            required: true,
                            ds160: "ddlUS_DRIVER_LICENSE_STATE",
                            optionsRef: "usStates"
                        }
                    ]
                },
                {
                    id: "hasUSVisa",
                    label: "Já recebeu um visto americano?",
                    type: "radio",
                    required: true,
                    ds160: "rblPREV_VISA_IND",
                    hint: "Selecione Sim se já lhe foi emitido qualquer tipo de visto para os EUA."
                },
                {
                    id: "previousVisaIssueDate",
                    label: "Data de emissão do último visto",
                    type: "date",
                    required: true,
                    showWhen: { field: "hasUSVisa", equals: "Y" },
                    ds160day: "ddlPREV_VISA_ISSUED_DTEDay",
                    ds160month: "ddlPREV_VISA_ISSUED_DTEMonth",
                    ds160year: "tbxPREV_VISA_ISSUED_DTEYear"
                },
                {
                    id: "previousVisaNumber",
                    label: "Número do visto",
                    type: "text",
                    required: true,
                    maxLen: 12,
                    allowUnknown: true,
                    showWhen: { field: "hasUSVisa", equals: "Y" },
                    ds160: "tbxPREV_VISA_FOIL_NUMBER",
                    hint: "Número de 8 dígitos em vermelho no canto inferior direito do visto. Se era Border Crossing Card, insira os últimos 12 dígitos da primeira linha da zona de leitura óptica."
                },
                {
                    id: "sameVisaType",
                    label: "Está solicitando o mesmo tipo de visto?",
                    type: "radio",
                    required: true,
                    showWhen: { field: "hasUSVisa", equals: "Y" },
                    ds160: "rblPREV_VISA_SAME_TYPE_IND"
                },
                {
                    id: "sameCountry",
                    label: "Está solicitando no mesmo país onde o visto acima foi emitido, e esse país é o seu local de residência principal?",
                    type: "radio",
                    required: true,
                    showWhen: { field: "hasUSVisa", equals: "Y" },
                    ds160: "rblPREV_VISA_SAME_CNTRY_IND"
                },
                {
                    id: "tenPrint",
                    label: "Já forneceu impressões digitais de todos os 10 dedos?",
                    type: "radio",
                    required: true,
                    showWhen: { field: "hasUSVisa", equals: "Y" },
                    ds160: "rblPREV_VISA_TEN_PRINT_IND",
                    hint: "Significa que forneceu impressões de todos os dedos das mãos, e não apenas duas impressões digitais."
                },
                {
                    id: "visaLost",
                    label: "Seu visto americano já foi perdido ou roubado?",
                    type: "radio",
                    required: true,
                    showWhen: { field: "hasUSVisa", equals: "Y" },
                    ds160: "rblPREV_VISA_LOST_IND"
                },
                {
                    id: "lostVisaYear",
                    label: "Ano em que o visto foi perdido ou roubado",
                    type: "text",
                    required: true,
                    maxLen: 4,
                    showWhen: { field: "visaLost", equals: "Y" },
                    ds160: "tbxPREV_VISA_LOST_YEAR"
                },
                {
                    id: "lostVisaExplanation",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 4000,
                    showWhen: { field: "visaLost", equals: "Y" },
                    ds160: "tbxPREV_VISA_LOST_EXPL"
                },
                {
                    id: "visaCancelled",
                    label: "Seu visto americano já foi cancelado ou revogado?",
                    type: "radio",
                    required: true,
                    showWhen: { field: "hasUSVisa", equals: "Y" },
                    ds160: "rblPREV_VISA_CANCELLED_IND"
                },
                {
                    id: "cancelledExplanation",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 4000,
                    showWhen: { field: "visaCancelled", equals: "Y" },
                    ds160: "tbxPREV_VISA_CANCELLED_EXPL"
                },
                {
                    id: "visaRefused",
                    label: "Já teve um visto americano negado, foi recusada a entrada nos EUA, ou retirou sua solicitação de admissão em um porto de entrada?",
                    type: "radio",
                    required: true,
                    ds160: "rblPREV_VISA_REFUSED_IND"
                },
                {
                    id: "visaRefusedExplanation",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 4000,
                    showWhen: { field: "visaRefused", equals: "Y" },
                    ds160: "tbxPREV_VISA_REFUSED_EXPL"
                },
                {
                    id: "immigrantPetition",
                    label: "Alguém já apresentou uma petição de imigrante em seu nome junto ao Serviço de Cidadania e Imigração dos EUA (USCIS)?",
                    type: "radio",
                    required: true,
                    ds160: "rblIV_PETITION_IND"
                },
                {
                    id: "immigrantPetitionExplanation",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 4000,
                    showWhen: { field: "immigrantPetition", equals: "Y" },
                    ds160: "tbxIV_PETITION_EXPL"
                },
                {
                    id: "vwpDenial",
                    label: "Já foi recusado(a) a entrada nos EUA pelo Programa de Isenção de Visto (Visa Waiver Program / ESTA)?",
                    type: "radio",
                    required: true,
                    ds160: "rblVWP_DENIAL_IND",
                    hint: "Aplica-se apenas a cidadãos de países participantes do Visa Waiver Program que tentaram entrar nos EUA sem visto."
                },
                {
                    id: "vwpDenialExplanation",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 4000,
                    showWhen: { field: "vwpDenial", equals: "Y" },
                    ds160: "tbxVWP_DENIAL_EXPL"
                }
            ]
        },
        {
            id: "addressPhone",
            label: "Endereço e Telefone",
            fields: [
                { id: "_homeAddressTitle", label: "Endereço Residencial", type: "heading" },
                {
                    id: "homeCountry",
                    label: "País / Região do endereço",
                    type: "select",
                    required: true,
                    ds160: "ddlCountry",
                    optionsRef: "countries",
                    default: "BRZL"
                },
                {
                    id: "homePostalCode",
                    label: "CEP / Código Postal",
                    type: "text",
                    required: true,
                    maxLen: 10,
                    allowNA: true,
                    ds160: "tbxAPP_ADDR_POSTAL_CD",
                    hint: "Digite o CEP para preencher o endereço automaticamente."
                },
                {
                    id: "homeStreet1",
                    label: "Rua / Endereço (Linha 1)",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    ds160: "tbxAPP_ADDR_LN1"
                },
                {
                    id: "homeStreet2",
                    label: "Rua / Endereço (Linha 2)",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    ds160: "tbxAPP_ADDR_LN2"
                },
                {
                    id: "homeCity",
                    label: "Cidade",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    noSpecial: true,
                    ds160: "tbxAPP_ADDR_CITY"
                },
                {
                    id: "homeState",
                    label: "Estado / Província",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    noSpecial: true,
                    allowNA: true,
                    ds160: "tbxAPP_ADDR_STATE"
                },
                {
                    id: "_mailingAddressTitle",
                    label: "Endereço para Correspondência",
                    type: "heading",
                    spaceBefore: 16
                },
                {
                    id: "mailingAddressSame",
                    label: "O seu endereço para correspondência é o mesmo do seu endereço residencial?",
                    type: "radio",
                    required: true,
                    ds160: "rblMailingAddrSame"
                },
                {
                    id: "mailCountry",
                    label: "País / Região do endereço",
                    type: "select",
                    required: true,
                    showWhen: { field: "mailingAddressSame", equals: "N" },
                    ds160: "ddlMailCountry",
                    optionsRef: "countries"
                },
                {
                    id: "mailPostalCode",
                    label: "CEP / Código Postal",
                    type: "text",
                    required: true,
                    maxLen: 10,
                    allowNA: true,
                    showWhen: { field: "mailingAddressSame", equals: "N" },
                    ds160: "tbxMAILING_ADDR_POSTAL_CD"
                },
                {
                    id: "mailStreet1",
                    label: "Rua / Endereço (Linha 1)",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    showWhen: { field: "mailingAddressSame", equals: "N" },
                    ds160: "tbxMAILING_ADDR_LN1"
                },
                {
                    id: "mailStreet2",
                    label: "Rua / Endereço (Linha 2)",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    showWhen: { field: "mailingAddressSame", equals: "N" },
                    ds160: "tbxMAILING_ADDR_LN2"
                },
                {
                    id: "mailCity",
                    label: "Cidade",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    showWhen: { field: "mailingAddressSame", equals: "N" },
                    ds160: "tbxMAILING_ADDR_CITY"
                },
                {
                    id: "mailState",
                    label: "Estado / Província",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    allowNA: true,
                    showWhen: { field: "mailingAddressSame", equals: "N" },
                    ds160: "tbxMAILING_ADDR_STATE"
                },
                { id: "_phoneTitle", label: "Telefone", type: "heading" },
                {
                    id: "phone",
                    label: "Número de Telefone Principal",
                    type: "phone",
                    required: true,
                    ds160: "tbxAPP_HOME_TEL",
                    hint: "Você deve fornecer um número de telefone principal. Este número deve ser o de mais fácil acesso (fixo ou celular)."
                },
                {
                    id: "mobilePhone",
                    label: "Número de Telefone Secundário",
                    type: "phone",
                    allowNA: true,
                    ds160: "tbxAPP_MOBILE_TEL",
                    hint: "Se possui outra linha fixa ou celular, informe aqui."
                },
                {
                    id: "businessPhone",
                    label: "Telefone Comercial",
                    type: "phone",
                    allowNA: true,
                    ds160: "tbxAPP_BUS_TEL"
                },
                {
                    id: "additionalPhones",
                    label: "Nos últimos cinco anos, utilizou algum outro número de telefone?",
                    type: "radio",
                    required: true,
                    ds160: "rblAddPhone"
                },
                {
                    id: "additionalPhoneNumbers",
                    label: "Telefone Adicional",
                    type: "array",
                    maxItems: 4,
                    showWhen: { field: "additionalPhones", equals: "Y" },
                    ds160List: "dtlAddPhone",
                    fields: [
                        {
                            id: "phone",
                            label: "Número de Telefone Adicional",
                            type: "phone",
                            required: true,
                            ds160: "tbxAddPhoneInfo"
                        }
                    ]
                },
                {
                    id: "email",
                    label: "Endereço de Email",
                    type: "email",
                    required: true,
                    maxLen: 50,
                    ds160: "tbxAPP_EMAIL_ADDR",
                    hint: "Você deve fornecer um endereço de email. O email informado será utilizado para correspondências. Forneça um email seguro e ao qual tenha acesso frequente. (ex: email@exemplo.com)"
                },
                {
                    id: "additionalEmails",
                    label: "Nos últimos cinco anos, utilizou algum outro endereço de email?",
                    type: "radio",
                    required: true,
                    ds160: "rblAddEmail"
                },
                {
                    id: "additionalEmailAddresses",
                    label: "Email Adicional",
                    type: "array",
                    maxItems: 4,
                    showWhen: { field: "additionalEmails", equals: "Y" },
                    ds160List: "dtlAddEmail",
                    fields: [
                        {
                            id: "email",
                            label: "Endereço de Email Adicional",
                            type: "email",
                            required: true,
                            maxLen: 50,
                            ds160: "tbxAddEmailInfo"
                        }
                    ]
                },
                { id: "_socialMediaTitle", label: "Redes Sociais", type: "heading" },
                {
                    id: "_socialMediaIntro",
                    label: "Você possui presença em redes sociais?",
                    type: "orientation",
                    text: "Da lista abaixo, selecione cada rede social que utilizou nos últimos cinco anos. No campo ao lado do nome da plataforma, informe o nome de usuário utilizado. Não forneça suas senhas. Se utilizou mais de uma plataforma ou mais de um nome de usuário em uma só plataforma, clique em 'Adicionar Outro' para listar cada um separadamente. Se não utilizou nenhuma das plataformas nos últimos cinco anos, selecione 'Nenhuma'."
                },
                {
                    id: "socialMedia",
                    label: "Redes Sociais",
                    type: "array",
                    maxItems: 5,
                    ds160List: "dtlSocial",
                    noneOnlyFirstEntry: true,
                    noneValue: "NONE",
                    noneField: "platform",
                    fields: [
                        {
                            id: "platform",
                            label: "Plataforma / Provedor de Rede Social",
                            type: "select",
                            required: true,
                            ds160: "ddlSocialMedia",
                            default: "NONE",
                            options: [
                                { value: "NONE", label: "NENHUMA" },
                                { value: "ASKF", label: "ASK.FM" },
                                { value: "DUBN", label: "DOUBAN" },
                                { value: "FCBK", label: "FACEBOOK" },
                                { value: "FLKR", label: "FLICKR" },
                                { value: "GOGL", label: "GOOGLE+" },
                                { value: "INST", label: "INSTAGRAM" },
                                { value: "LINK", label: "LINKEDIN" },
                                { value: "MYSP", label: "MYSPACE" },
                                { value: "PTST", label: "PINTEREST" },
                                { value: "QZNE", label: "QZONE (QQ)" },
                                { value: "RDDT", label: "REDDIT" },
                                { value: "SWBO", label: "SINA WEIBO" },
                                { value: "TWBO", label: "TENCENT WEIBO" },
                                { value: "TUMB", label: "TUMBLR" },
                                { value: "TWIT", label: "TWITTER" },
                                { value: "TWOO", label: "TWOO" },
                                { value: "VINE", label: "VINE" },
                                { value: "VKON", label: "VKONTAKTE (VK)" },
                                { value: "YUKU", label: "YOUKU" },
                                { value: "YTUB", label: "YOUTUBE" }
                            ]
                        },
                        {
                            id: "handle",
                            label: "Identificador da Rede Social",
                            type: "text",
                            required: true,
                            maxLen: 50,
                            ds160: "tbxSocialMediaIdent"
                        }
                    ]
                },
                {
                    id: "additionalSocialMedia",
                    label: "Deseja fornecer informações sobre a sua presença em outros sites ou aplicativos que tenha usado nos últimos cinco anos para criar ou compartilhar conteúdo (fotos, vídeos, atualizações, etc.)?",
                    type: "radio",
                    required: true,
                    ds160: "rblAddSocial",
                    hint: "Não inclui mensagens privadas / serviços de mensagens pessoa-a-pessoa, como WhatsApp."
                },
                {
                    id: "additionalSocialMediaAccounts",
                    label: "Outras Redes Sociais",
                    type: "array",
                    maxItems: 4,
                    showWhen: { field: "additionalSocialMedia", equals: "Y" },
                    ds160List: "dtlAddSocial",
                    fields: [
                        {
                            id: "platform",
                            label: "Plataforma de Rede Social Adicional",
                            type: "text",
                            required: true,
                            maxLen: 40,
                            ds160: "tbxAddSocialPlat"
                        },
                        {
                            id: "handle",
                            label: "Identificador de Rede Social Adicional",
                            type: "text",
                            required: true,
                            maxLen: 40,
                            ds160: "tbxAddSocialHand"
                        }
                    ]
                }
            ]
        },
        {
            id: "passport",
            label: "Passaporte",
            fields: [
                {
                    id: "type",
                    label: "Tipo de Passaporte",
                    type: "select",
                    required: true,
                    ds160: "ddlPPT_TYPE",
                    options: [
                        { value: "R", label: "Regular" },
                        { value: "D", label: "Diplomático" },
                        { value: "O", label: "Oficial" },
                        { value: "L", label: "Laissez-Passer" },
                        { value: "OT", label: "Outro" }
                    ]
                },
                {
                    id: "typeExplanation",
                    label: "Explique outro tipo",
                    type: "textarea",
                    required: true,
                    maxLen: 200,
                    showWhen: { field: "type", equals: "OT" },
                    ds160: "tbxPptOtherExpl"
                },
                {
                    id: "number",
                    label: "Número do Passaporte",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    ds160: "tbxPPT_NUM",
                    hint: "Insira exatamente como consta no passaporte, incluindo letras e números."
                },
                {
                    id: "bookNumber",
                    label: "Número do Livro do Passaporte",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    allowNA: true,
                    ds160: "tbxPPT_BOOK_NUM",
                    hint: "O número do livro pode estar impresso na contracapa do passaporte. Marque 'Não se Aplica' se não houver."
                },
                {
                    id: "issuingCountry",
                    label: "País/Autoridade que Emitiu",
                    type: "select",
                    required: true,
                    ds160: "ddlPPT_ISSUED_CNTRY",
                    optionsRef: "countries",
                    hint: "País ou autoridade responsável pela emissão do passaporte."
                },
                {
                    id: "issuedCity",
                    label: "Cidade de Emissão",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    noSpecial: true,
                    ds160: "tbxPPT_ISSUED_IN_CITY"
                },
                {
                    id: "issuedState",
                    label: "Estado/Província de Emissão",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    noSpecial: true,
                    ds160: "tbxPPT_ISSUED_IN_STATE"
                },
                {
                    id: "issuedCountry",
                    label: "País/Região onde foi emitido",
                    type: "select",
                    required: true,
                    ds160: "ddlPPT_ISSUED_IN_CNTRY",
                    optionsRef: "countries",
                    hint: "Local físico onde o passaporte foi emitido (pode ser diferente do país emissor)."
                },
                {
                    id: "issuanceDate",
                    label: "Data de Emissão",
                    type: "date",
                    required: true,
                    ds160day: "ddlPPT_ISSUED_DTEDay",
                    ds160month: "ddlPPT_ISSUED_DTEMonth",
                    ds160year: "tbxPPT_ISSUEDYear",
                    hint: "Data em que o passaporte foi emitido."
                },
                {
                    id: "expirationDate",
                    label: "Data de Expiração",
                    type: "date",
                    required: true,
                    allowNA: true,
                    ds160day: "ddlPPT_EXPIRE_DTEDay",
                    ds160month: "ddlPPT_EXPIRE_DTEMonth",
                    ds160year: "tbxPPT_EXPIREYear",
                    hint: "Marque 'Não se Aplica' se o passaporte não tiver data de expiração."
                },
                {
                    id: "lostOrStolen",
                    label: "Já perdeu passaporte ou teve roubado?",
                    type: "radio",
                    required: true,
                    ds160: "rblLOST_PPT_IND",
                    hint: "Inclui todos os passaportes anteriores, não apenas o atual."
                },
                {
                    id: "lostPassports",
                    label: "Passaportes perdidos/roubados",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "lostOrStolen", equals: "Y" },
                    ds160List: "dtlLostPPT",
                    fields: [
                        {
                            id: "number",
                            label: "Número",
                            type: "text",
                            required: true,
                            maxLen: 20,
                            ds160: "tbxLOST_PPT_NUM"
                        },
                        {
                            id: "country",
                            label: "País",
                            type: "select",
                            required: true,
                            ds160: "ddlLOST_PPT_NATL",
                            optionsRef: "countries"
                        },
                        {
                            id: "explanation",
                            label: "Explique",
                            type: "textarea",
                            required: true,
                            maxLen: 200,
                            ds160: "tbxLOST_PPT_EXPL"
                        }
                    ]
                }
            ]
        },
        {
            id: "usContact",
            label: "Contato nos EUA",
            fields: [
                {
                    id: "_contactIntro",
                    label: "Pessoa ou Organização de Contato nos Estados Unidos",
                    type: "orientation",
                    text: "Seu ponto de contato pode ser qualquer pessoa nos EUA que o conheça e possa, se necessário, verificar sua identidade. Se não conhecer ninguém pessoalmente, informe o nome da loja, empresa ou organização que pretende visitar."
                },
                {
                    id: "contactType",
                    label: "Tipo de Contato",
                    type: "radio",
                    required: true,
                    options: [
                        { value: "P", label: "Pessoa" },
                        { value: "O", label: "Organização" }
                    ]
                },
                {
                    id: "surname",
                    label: "Sobrenome do Contato",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    showWhen: { field: "contactType", equals: "P" },
                    ds160: "tbxUS_POC_SURNAME"
                },
                {
                    id: "givenName",
                    label: "Nome do Contato",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    showWhen: { field: "contactType", equals: "P" },
                    ds160: "tbxUS_POC_GIVEN_NAME"
                },
                {
                    id: "organization",
                    label: "Nome da Organização",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    showWhen: { field: "contactType", equals: "O" },
                    ds160: "tbxUS_POC_ORGANIZATION"
                },
                {
                    id: "relationship",
                    label: "Relação com Você",
                    type: "select",
                    required: true,
                    ds160: "ddlUS_POC_REL_TO_APP",
                    optionsRef: "usContactRelationships"
                },
                {
                    id: "usContactStreet1",
                    label: "Endereço nos EUA (Linha 1)",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    ds160: "tbxUS_POC_ADDR_LN1"
                },
                {
                    id: "usContactStreet2",
                    label: "Endereço nos EUA (Linha 2)",
                    type: "text",
                    maxLen: 40,
                    ds160: "tbxUS_POC_ADDR_LN2",
                    hint: "Opcional"
                },
                {
                    id: "usContactCity",
                    label: "Cidade",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    ds160: "tbxUS_POC_ADDR_CITY"
                },
                {
                    id: "usContactState",
                    label: "Estado",
                    type: "select",
                    required: true,
                    ds160: "ddlUS_POC_ADDR_STATE",
                    optionsRef: "usStates"
                },
                {
                    id: "usContactZip",
                    label: "CEP (ZIP Code)",
                    type: "text",
                    required: true,
                    maxLen: 10,
                    ds160: "tbxUS_POC_ADDR_POSTAL_CD",
                    hint: "ex: 55555 ou 55555-5555"
                },
                {
                    id: "usContactPhone",
                    label: "Telefone",
                    type: "phone",
                    required: true,
                    phoneCountry: "us",
                    phoneLocked: true,
                    ds160: "tbxUS_POC_HOME_TEL",
                    hint: "ex: 5555555555"
                },
                {
                    id: "usContactEmail",
                    label: "Email",
                    type: "email",
                    required: true,
                    maxLen: 50,
                    allowNA: true,
                    ds160: "tbxUS_POC_EMAIL_ADDR",
                    hint: "Preencha ou marque 'Não se Aplica'"
                }
            ]
        },
        {
            id: "family1",
            label: "Família - Pais",
            fields: [
                { id: "h_father", label: "Nome Completo e Data de Nascimento do Pai", type: "heading" },
                {
                    id: "fatherSurname",
                    label: "Sobrenome do Pai",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    allowUnknown: true,
                    ds160: "tbxFATHER_SURNAME"
                },
                {
                    id: "fatherGivenName",
                    label: "Nome do Pai",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    allowUnknown: true,
                    ds160: "tbxFATHER_GIVEN_NAME"
                },
                {
                    id: "fatherDob",
                    label: "Data de Nascimento do Pai",
                    type: "date",
                    required: true,
                    allowUnknown: true,
                    hideWhenAllUnknown: ["fatherSurname", "fatherGivenName"],
                    ds160day: "ddlFathersDOBDay",
                    ds160month: "ddlFathersDOBMonth",
                    ds160year: "tbxFathersDOBYear"
                },
                {
                    id: "fatherInUS",
                    label: "Pai está nos EUA?",
                    type: "radio",
                    required: true,
                    hideWhenAllUnknown: ["fatherSurname", "fatherGivenName"],
                    ds160: "rblFATHER_LIVE_IN_US_IND"
                },
                {
                    id: "fatherUSStatus",
                    label: "Status do pai nos EUA",
                    type: "select",
                    required: true,
                    showWhen: { field: "fatherInUS", equals: "Y" },
                    ds160: "ddlFATHER_US_STATUS",
                    optionsRef: "usStatus"
                },
                {
                    id: "h_mother",
                    label: "Nome Completo e Data de Nascimento da Mãe",
                    type: "heading",
                    spaceBefore: 16
                },
                {
                    id: "motherSurname",
                    label: "Sobrenome da Mãe",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    allowUnknown: true,
                    ds160: "tbxMOTHER_SURNAME"
                },
                {
                    id: "motherGivenName",
                    label: "Nome da Mãe",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    allowUnknown: true,
                    ds160: "tbxMOTHER_GIVEN_NAME"
                },
                {
                    id: "motherDob",
                    label: "Data de Nascimento da Mãe",
                    type: "date",
                    required: true,
                    allowUnknown: true,
                    hideWhenAllUnknown: ["motherSurname", "motherGivenName"],
                    ds160day: "ddlMothersDOBDay",
                    ds160month: "ddlMothersDOBMonth",
                    ds160year: "tbxMothersDOBYear"
                },
                {
                    id: "motherInUS",
                    label: "Mãe está nos EUA?",
                    type: "radio",
                    required: true,
                    hideWhenAllUnknown: ["motherSurname", "motherGivenName"],
                    ds160: "rblMOTHER_LIVE_IN_US_IND"
                },
                {
                    id: "motherUSStatus",
                    label: "Status da mãe nos EUA",
                    type: "select",
                    required: true,
                    showWhen: { field: "motherInUS", equals: "Y" },
                    ds160: "ddlMOTHER_US_STATUS",
                    optionsRef: "usStatus"
                },
                {
                    id: "immediateRelativesInUS",
                    label: "Tem parentes imediatos nos EUA?",
                    type: "radio",
                    required: true,
                    spaceBefore: 16,
                    ds160: "rblUS_IMMED_RELATIVE_IND",
                    hint: "Parentes imediatos incluem: cônjuge, noivo(a), filho(a), irmão/irmã. Não inclui pais (já informados acima)."
                },
                {
                    id: "otherRelativesInUS",
                    label: "Tem outros parentes nos EUA?",
                    type: "radio",
                    required: true,
                    spaceBefore: 16,
                    showWhen: { field: "immediateRelativesInUS", equals: "N" },
                    ds160: "rblUS_OTHER_RELATIVE_IND"
                },
                {
                    id: "relatives",
                    label: "Parentes nos EUA",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "immediateRelativesInUS", equals: "Y" },
                    ds160List: "dlUSRelatives",
                    fields: [
                        {
                            id: "givenName",
                            label: "Nome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxUS_REL_GIVEN_NAME"
                        },
                        {
                            id: "surname",
                            label: "Sobrenome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxUS_REL_SURNAME"
                        },
                        {
                            id: "type",
                            label: "Parentesco",
                            type: "select",
                            required: true,
                            ds160: "ddlUS_REL_TYPE",
                            optionsRef: "relativeTypes"
                        },
                        {
                            id: "status",
                            label: "Status migratório",
                            type: "select",
                            required: true,
                            ds160: "ddlUS_REL_STATUS",
                            optionsRef: "usStatus"
                        }
                    ]
                },
                {
                    id: "otherRelatives",
                    label: "Outros parentes nos EUA",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "otherRelativesInUS", equals: "Y" },
                    ds160List: "dlUSRelatives",
                    fields: [
                        {
                            id: "givenName",
                            label: "Nome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxUS_REL_GIVEN_NAME"
                        },
                        {
                            id: "surname",
                            label: "Sobrenome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxUS_REL_SURNAME"
                        },
                        {
                            id: "type",
                            label: "Parentesco",
                            type: "select",
                            required: true,
                            ds160: "ddlUS_REL_TYPE",
                            optionsRef: "relativeTypes"
                        },
                        {
                            id: "status",
                            label: "Status migratório",
                            type: "select",
                            required: true,
                            ds160: "ddlUS_REL_STATUS",
                            optionsRef: "usStatus"
                        }
                    ]
                }
            ]
        },
        {
            id: "family2",
            label: "Família - Cônjuge/Parceiro(a)",
            conditional: true,
            showWhen: {
                section: "personal1",
                field: "maritalStatus",
                in: ["M", "C", "L", "U"]
            },
            fields: [
                {
                    id: "spouseSurname",
                    label: "Sobrenome do Cônjuge/Parceiro(a)",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    ds160: "tbxSpouseSurname"
                },
                {
                    id: "spouseGivenName",
                    label: "Nome do Cônjuge/Parceiro(a)",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    ds160: "tbxSpouseGivenName"
                },
                {
                    id: "spouseDob",
                    label: "Data de Nascimento",
                    type: "date",
                    required: true,
                    ds160day: "ddlDOBDay",
                    ds160month: "ddlDOBMonth",
                    ds160year: "tbxDOBYear"
                },
                {
                    id: "spouseNationality",
                    label: "Nacionalidade",
                    type: "select",
                    required: true,
                    ds160: "ddlSpouseNatDropDownList",
                    optionsRef: "countries"
                },
                { id: "h_spousePOB", label: "Local de Nascimento do Cônjuge/Parceiro(a)", type: "heading" },
                {
                    id: "spouseCityOfBirth",
                    label: "Cidade de Nascimento",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    allowUnknown: true,
                    ds160: "tbxSpousePOBCity"
                },
                {
                    id: "spouseCountryOfBirth",
                    label: "País de Nascimento",
                    type: "select",
                    required: true,
                    ds160: "ddlSpousePOBCountry",
                    optionsRef: "countries"
                },
                {
                    id: "spouseAddressType",
                    label: "Endereço do Cônjuge/Parceiro(a)",
                    type: "select",
                    required: true,
                    ds160: "ddlSpouseAddressType",
                    options: [
                        { value: "H", label: "Mesmo endereço residencial" },
                        { value: "M", label: "Mesmo endereço para correspondência" },
                        { value: "U", label: "Mesmo endereço de contato nos EUA" },
                        { value: "D", label: "Desconhecido" },
                        { value: "O", label: "Outro (especificar endereço)" }
                    ]
                },
                {
                    id: "spouseCountry",
                    label: "País",
                    type: "select",
                    required: true,
                    showWhen: { field: "spouseAddressType", equals: "O" },
                    ds160: "ddlSPOUSE_ADDR_CNTRY",
                    optionsRef: "countries",
                    default: "BRZL"
                },
                {
                    id: "spousePostalCode",
                    label: "CEP / Código Postal",
                    type: "text",
                    required: true,
                    maxLen: 10,
                    allowNA: true,
                    showWhen: { field: "spouseAddressType", equals: "O" },
                    ds160: "tbxSPOUSE_ADDR_POSTAL_CD",
                    hint: "Digite o CEP para preencher o endereço automaticamente."
                },
                {
                    id: "spouseStreet1",
                    label: "Endereço - Linha 1",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    showWhen: { field: "spouseAddressType", equals: "O" },
                    ds160: "tbxSPOUSE_ADDR_LN1",
                    hint: "Número de caixa postal não será aceito."
                },
                {
                    id: "spouseStreet2",
                    label: "Endereço - Linha 2",
                    type: "text",
                    maxLen: 40,
                    showWhen: { field: "spouseAddressType", equals: "O" },
                    ds160: "tbxSPOUSE_ADDR_LN2"
                },
                {
                    id: "spouseCity",
                    label: "Cidade",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    showWhen: { field: "spouseAddressType", equals: "O" },
                    ds160: "tbxSPOUSE_ADDR_CITY"
                },
                {
                    id: "spouseState",
                    label: "Estado / Província",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    allowNA: true,
                    showWhen: { field: "spouseAddressType", equals: "O" },
                    ds160: "tbxSPOUSE_ADDR_STATE"
                }
            ]
        },
        {
            id: "deceasedSpouse",
            label: "Cônjuge Falecido",
            conditional: true,
            showWhen: { section: "personal1", field: "maritalStatus", equals: "W" },
            fields: [
                {
                    id: "surname",
                    label: "Sobrenome",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    ds160: "tbxSURNAME"
                },
                {
                    id: "givenName",
                    label: "Nome",
                    type: "text",
                    required: true,
                    maxLen: 33,
                    noSpecial: true,
                    uppercase: true,
                    ds160: "tbxGIVEN_NAME"
                },
                {
                    id: "dob",
                    label: "Data de Nascimento",
                    type: "date",
                    required: true,
                    ds160day: "ddlDOBDay",
                    ds160month: "ddlDOBMonth",
                    ds160year: "tbxDOBYear"
                },
                {
                    id: "nationality",
                    label: "Nacionalidade",
                    type: "select",
                    required: true,
                    ds160: "ddlSpouseNatDropDownList",
                    optionsRef: "countries"
                },
                { id: "h_deceasedPOB", label: "Local de Nascimento do Cônjuge Falecido", type: "heading" },
                {
                    id: "cityOfBirth",
                    label: "Cidade de Nascimento",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    allowUnknown: true,
                    ds160: "tbxSpousePOBCity"
                },
                {
                    id: "countryOfBirth",
                    label: "País de Nascimento",
                    type: "select",
                    required: true,
                    ds160: "ddlSpousePOBCountry",
                    optionsRef: "countries"
                }
            ]
        },
        {
            id: "prevSpouse",
            label: "Ex-Cônjuge",
            conditional: true,
            showWhen: { section: "personal1", field: "maritalStatus", equals: "D" },
            fields: [
                {
                    id: "numberOfPrevious",
                    label: "Número de ex-cônjuges",
                    type: "text",
                    required: true,
                    maxLen: 2,
                    ds160: "tbxNumberOfPrevSpouses"
                },
                {
                    id: "spouses",
                    label: "Informações do(a) ex-cônjuge",
                    type: "array",
                    maxItems: 5,
                    ds160List: "DListSpouse",
                    fields: [
                        {
                            id: "surname",
                            label: "Sobrenome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxSURNAME"
                        },
                        {
                            id: "givenName",
                            label: "Nome",
                            type: "text",
                            required: true,
                            maxLen: 33,
                            noSpecial: true,
                            uppercase: true,
                            ds160: "tbxGIVEN_NAME"
                        },
                        {
                            id: "dob",
                            label: "Data de Nascimento",
                            type: "date",
                            required: true,
                            ds160day: "ddlDOBDay",
                            ds160month: "ddlDOBMonth",
                            ds160year: "tbxDOBYear"
                        },
                        {
                            id: "nationality",
                            label: "Nacionalidade",
                            type: "select",
                            required: true,
                            ds160: "ddlSpouseNatDropDownList",
                            optionsRef: "countries"
                        },
                        { id: "h_formerPOB", label: "Local de Nascimento do(a) Ex-Cônjuge", type: "heading" },
                        {
                            id: "pobCity",
                            label: "Cidade de Nascimento",
                            type: "text",
                            required: true,
                            maxLen: 20,
                            allowUnknown: true,
                            ds160: "tbxSpousePOBCity"
                        },
                        {
                            id: "pobCountry",
                            label: "País de Nascimento",
                            type: "select",
                            required: true,
                            ds160: "ddlSpousePOBCountry",
                            optionsRef: "countries"
                        },
                        {
                            id: "dateOfMarriage",
                            label: "Data do Casamento",
                            type: "date",
                            required: true,
                            ds160day: "ddlDomDay",
                            ds160month: "ddlDomMonth",
                            ds160year: "txtDomYear"
                        },
                        {
                            id: "dateMarriageEnded",
                            label: "Data do Término do Casamento",
                            type: "date",
                            required: true,
                            ds160day: "ddlDomEndDay",
                            ds160month: "ddlDomEndMonth",
                            ds160year: "txtDomEndYear"
                        },
                        {
                            id: "howEnded",
                            label: "Como o casamento terminou",
                            type: "textarea",
                            required: true,
                            maxLen: 4000,
                            ds160: "tbxHowMarriageEnded"
                        },
                        {
                            id: "countryTerminated",
                            label: "País/Região onde o casamento foi dissolvido",
                            type: "select",
                            required: true,
                            ds160: "ddlMarriageEnded_CNTRY",
                            optionsRef: "countries"
                        }
                    ]
                }
            ]
        },
        {
            id: "workEducation1",
            label: "Trabalho/Educação - Atual",
            fields: [
                {
                    id: "occupation",
                    label: "Ocupação/Profissão",
                    type: "select",
                    required: true,
                    ds160: "ddlPresentOccupation",
                    optionsRef: "occupations",
                    hint: "Forneça informações sobre seu emprego ou educação atual."
                },
                {
                    id: "otherOccupation",
                    label: "Especifique ocupação",
                    type: "textarea",
                    required: true,
                    maxLen: 40,
                    showWhen: { field: "occupation", equals: "O" },
                    ds160: "tbxOtherOccupation"
                },
                {
                    id: "employerName",
                    label: "Nome do Empregador/Escola",
                    type: "text",
                    required: true,
                    maxLen: 75,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "tbxEmpSchName"
                },
                {
                    id: "employerCountry",
                    label: "País / Região do endereço",
                    type: "select",
                    required: true,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "ddlEmpSchCountry",
                    optionsRef: "countries"
                },
                {
                    id: "employerPostalCode",
                    label: "CEP / Código Postal",
                    type: "text",
                    required: true,
                    maxLen: 10,
                    allowNA: true,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "tbxWORK_EDUC_ADDR_POSTAL_CD",
                    hint: "Digite o CEP para preencher o endereço automaticamente."
                },
                {
                    id: "employerStreet1",
                    label: "Endereço - Linha 1",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "tbxEmpSchAddr1",
                    hint: "Endereço do empregador ou escola atual."
                },
                {
                    id: "employerStreet2",
                    label: "Endereço - Linha 2",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "tbxEmpSchAddr2"
                },
                {
                    id: "employerCity",
                    label: "Cidade",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "tbxEmpSchCity"
                },
                {
                    id: "employerState",
                    label: "Estado / Província",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    allowNA: true,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "tbxWORK_EDUC_ADDR_STATE"
                },
                {
                    id: "employerPhone",
                    label: "Telefone",
                    type: "phone",
                    required: true,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "tbxWORK_EDUC_TEL"
                },
                {
                    id: "employerStartDate",
                    label: "Data de início",
                    type: "date",
                    required: true,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160day: "ddlEmpDateFromDay",
                    ds160month: "ddlEmpDateFromMonth",
                    ds160year: "tbxEmpDateFromYear"
                },
                {
                    id: "monthlySalary",
                    label: "Salário mensal em Real (R$)",
                    type: "text",
                    required: true,
                    maxLen: 15,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "tbxCURR_MONTHLY_SALARY"
                },
                {
                    id: "duties",
                    label: "Descrição das funções",
                    type: "textarea",
                    required: true,
                    maxLen: 4000,
                    showWhen: {
                        field: "occupation",
                        notIn: ["RT", "H", "N"]
                    },
                    ds160: "tbxDescribeDuties"
                }
            ]
        },
        {
            id: "workEducation2",
            label: "Trabalho/Educação - Anterior",
            fields: [
                {
                    id: "hasPreviousEmployment",
                    label: "Já trabalhou anteriormente?",
                    type: "radio",
                    required: true,
                    ds160: "rblPreviouslyEmployed"
                },
                {
                    id: "previousEmployment",
                    label: "Empregos anteriores",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "hasPreviousEmployment", equals: "Y" },
                    ds160List: "dtlPrevEmpl",
                    fields: [
                        {
                            id: "name",
                            label: "Empregador",
                            type: "text",
                            required: true,
                            maxLen: 75,
                            fullWidth: true,
                            ds160: "tbEmployerName"
                        },
                        {
                            id: "prevEmplCountry",
                            label: "País / Região",
                            type: "select",
                            required: true,
                            fullWidth: true,
                            ds160: "DropDownList2",
                            optionsRef: "countries"
                        },
                        {
                            id: "prevEmplPostalCode",
                            label: "CEP / Código Postal",
                            type: "text",
                            maxLen: 10,
                            allowNA: true,
                            fullWidth: true,
                            ds160: "tbxPREV_EMPL_ADDR_POSTAL_CD",
                            hint: "Digite o CEP para preencher o endereço automaticamente."
                        },
                        {
                            id: "prevEmplStreet1",
                            label: "Endereço - Linha 1",
                            type: "text",
                            required: true,
                            maxLen: 40,
                            fullWidth: true,
                            ds160: "tbEmployerStreetAddress1"
                        },
                        {
                            id: "prevEmplStreet2",
                            label: "Endereço - Linha 2",
                            type: "text",
                            maxLen: 40,
                            fullWidth: true,
                            ds160: "tbEmployerStreetAddress2",
                            hint: "Opcional"
                        },
                        {
                            id: "prevEmplCity",
                            label: "Cidade",
                            type: "text",
                            required: true,
                            maxLen: 20,
                            fullWidth: true,
                            ds160: "tbEmployerCity"
                        },
                        {
                            id: "prevEmplState",
                            label: "Estado / Província",
                            type: "text",
                            maxLen: 20,
                            allowNA: true,
                            fullWidth: true,
                            ds160: "tbxPREV_EMPL_ADDR_STATE"
                        },
                        {
                            id: "prevEmplPhone",
                            label: "Telefone",
                            type: "phone",
                            fullWidth: true,
                            ds160: "tbEmployerPhone"
                        },
                        {
                            id: "jobTitle",
                            label: "Cargo",
                            type: "text",
                            maxLen: 75,
                            fullWidth: true,
                            ds160: "tbJobTitle"
                        },
                        {
                            id: "supervisor",
                            label: "Supervisor (sobrenome)",
                            type: "text",
                            maxLen: 33,
                            allowNA: true,
                            fullWidth: true,
                            ds160: "tbSupervisorSurname"
                        },
                        {
                            id: "supervisorGivenName",
                            label: "Supervisor (nome)",
                            type: "text",
                            maxLen: 33,
                            allowNA: true,
                            fullWidth: true,
                            ds160: "tbSupervisorGivenName"
                        },
                        {
                            id: "startDate",
                            label: "Data início",
                            type: "date",
                            required: true,
                            fullWidth: true,
                            ds160day: "ddlEmpDateFromDay",
                            ds160month: "ddlEmpDateFromMonth",
                            ds160year: "tbxEmpDateFromYear"
                        },
                        {
                            id: "endDate",
                            label: "Data término",
                            type: "date",
                            required: true,
                            fullWidth: true,
                            ds160day: "ddlEmpDateToDay",
                            ds160month: "ddlEmpDateToMonth",
                            ds160year: "tbxEmpDateToYear"
                        },
                        {
                            id: "duties",
                            label: "Funções",
                            type: "textarea",
                            maxLen: 4000,
                            fullWidth: true,
                            ds160: "tbDescribeDuties"
                        }
                    ]
                },
                {
                    id: "hasEducation",
                    label: "Possui educação adicional?",
                    type: "radio",
                    required: true,
                    ds160: "rblOtherEduc"
                },
                {
                    id: "education",
                    label: "Instituições de ensino",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "hasEducation", equals: "Y" },
                    ds160List: "dtlPrevEduc",
                    fields: [
                        {
                            id: "name",
                            label: "Instituição",
                            type: "text",
                            required: true,
                            maxLen: 75,
                            fullWidth: true,
                            ds160: "tbxSchoolName"
                        },
                        {
                            id: "schoolCountry",
                            label: "País / Região",
                            type: "select",
                            required: true,
                            fullWidth: true,
                            ds160: "ddlSchoolCountry",
                            optionsRef: "countries"
                        },
                        {
                            id: "schoolPostalCode",
                            label: "CEP / Código Postal",
                            type: "text",
                            maxLen: 10,
                            allowNA: true,
                            fullWidth: true,
                            ds160: "tbxEDUC_INST_POSTAL_CD",
                            hint: "Digite o CEP para preencher o endereço automaticamente."
                        },
                        {
                            id: "schoolStreet1",
                            label: "Endereço - Linha 1",
                            type: "text",
                            required: true,
                            maxLen: 40,
                            fullWidth: true,
                            ds160: "tbxSchoolAddr1"
                        },
                        {
                            id: "schoolStreet2",
                            label: "Endereço - Linha 2",
                            type: "text",
                            maxLen: 40,
                            fullWidth: true,
                            ds160: "tbxSchoolAddr2",
                            hint: "Opcional"
                        },
                        {
                            id: "schoolCity",
                            label: "Cidade",
                            type: "text",
                            required: true,
                            maxLen: 20,
                            fullWidth: true,
                            ds160: "tbxSchoolCity"
                        },
                        {
                            id: "schoolState",
                            label: "Estado / Província",
                            type: "text",
                            maxLen: 20,
                            allowNA: true,
                            fullWidth: true,
                            ds160: "tbxEDUC_INST_ADDR_STATE"
                        },
                        {
                            id: "course",
                            label: "Curso",
                            type: "text",
                            required: true,
                            maxLen: 66,
                            fullWidth: true,
                            ds160: "tbxSchoolCourseOfStudy"
                        },
                        {
                            id: "startDate",
                            label: "Data início",
                            type: "date",
                            required: true,
                            fullWidth: true,
                            ds160day: "ddlSchoolFromDay",
                            ds160month: "ddlSchoolFromMonth",
                            ds160year: "tbxSchoolFromYear"
                        },
                        {
                            id: "endDate",
                            label: "Data término",
                            type: "date",
                            required: true,
                            fullWidth: true,
                            ds160day: "ddlSchoolToDay",
                            ds160month: "ddlSchoolToMonth",
                            ds160year: "tbxSchoolToYear"
                        }
                    ]
                }
            ]
        },
        {
            id: "workEducation3",
            label: "Trabalho/Educação - Adicional",
            fields: [
                {
                    id: "clanTribe",
                    label: "Pertence a algum clã ou tribo?",
                    type: "radio",
                    required: true,
                    ds160: "rblCLAN_TRIBE_IND"
                },
                {
                    id: "clanTribeName",
                    label: "Nome do clã/tribo",
                    type: "text",
                    required: true,
                    maxLen: 80,
                    showWhen: { field: "clanTribe", equals: "Y" },
                    ds160: "tbxCLAN_TRIBE_NAME"
                },
                {
                    id: "languages",
                    label: "Idiomas que fala",
                    type: "array",
                    maxItems: 5,
                    ds160List: "dtlLANGUAGES",
                    fields: [
                        {
                            id: "name",
                            label: "Idioma",
                            type: "text",
                            required: true,
                            maxLen: 66,
                            fullWidth: true,
                            ds160: "tbxLANGUAGE_NAME"
                        }
                    ]
                },
                {
                    id: "countriesVisited",
                    label: "Visitou outros países nos últimos 5 anos?",
                    type: "radio",
                    required: true,
                    ds160: "rblCOUNTRIES_VISITED_IND",
                    hint: "Informe todos os países/regiões que visitou nos últimos 5 anos."
                },
                {
                    id: "countriesVisitedList",
                    label: "Países visitados",
                    type: "array",
                    maxItems: 10,
                    showWhen: { field: "countriesVisited", equals: "Y" },
                    ds160List: "dtlCountriesVisited",
                    fields: [
                        {
                            id: "country",
                            label: "País / Região",
                            type: "select",
                            required: true,
                            fullWidth: true,
                            ds160: "ddlCOUNTRIES_VISITED",
                            optionsRef: "countries"
                        }
                    ]
                },
                {
                    id: "organizationMember",
                    label: "Pertenceu, contribuiu ou trabalhou em organizações profissionais, sociais ou de caridade?",
                    type: "radio",
                    required: true,
                    ds160: "rblORGANIZATION_IND"
                },
                {
                    id: "organizations",
                    label: "Organizações",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "organizationMember", equals: "Y" },
                    ds160List: "dtlORGANIZATIONS",
                    fields: [
                        {
                            id: "name",
                            label: "Nome da organização",
                            type: "text",
                            required: true,
                            maxLen: 66,
                            fullWidth: true,
                            ds160: "tbxORGANIZATION_NAME"
                        }
                    ]
                },
                {
                    id: "specializedSkills",
                    label: "Possui habilidades ou treinamento especializado?",
                    type: "radio",
                    required: true,
                    ds160: "rblSPECIALIZED_SKILLS_IND",
                    hint: "Inclui treinamento em armas de fogo, explosivos, energia nuclear/biológica/química."
                },
                {
                    id: "specializedSkillsExplanation",
                    label: "Descreva",
                    type: "textarea",
                    required: true,
                    maxLen: 4000,
                    showWhen: { field: "specializedSkills", equals: "Y" },
                    ds160: "tbxSPECIALIZED_SKILLS_EXPL"
                },
                {
                    id: "militaryService",
                    label: "Já serviu nas forças armadas?",
                    type: "radio",
                    required: true,
                    ds160: "rblMILITARY_SERVICE_IND"
                },
                {
                    id: "military",
                    label: "Serviço militar",
                    type: "array",
                    maxItems: 5,
                    showWhen: { field: "militaryService", equals: "Y" },
                    ds160List: "dtlMILITARY_SERVICE",
                    fields: [
                        {
                            id: "country",
                            label: "País / Região",
                            type: "select",
                            required: true,
                            fullWidth: true,
                            ds160: "ddlMILITARY_SVC_CNTRY",
                            optionsRef: "countries"
                        },
                        {
                            id: "branch",
                            label: "Ramo das Forças Armadas",
                            type: "text",
                            required: true,
                            maxLen: 40,
                            fullWidth: true,
                            ds160: "tbxMILITARY_SVC_BRANCH"
                        },
                        {
                            id: "rank",
                            label: "Patente / Posto",
                            type: "text",
                            required: true,
                            maxLen: 40,
                            fullWidth: true,
                            ds160: "tbxMILITARY_SVC_RANK"
                        },
                        {
                            id: "specialty",
                            label: "Especialidade Militar",
                            type: "text",
                            required: true,
                            maxLen: 40,
                            fullWidth: true,
                            ds160: "tbxMILITARY_SVC_SPECIALTY"
                        },
                        {
                            id: "startDate",
                            label: "Data início",
                            type: "date",
                            required: true,
                            fullWidth: true,
                            ds160day: "ddlMILITARY_SVC_FROMDay",
                            ds160month: "ddlMILITARY_SVC_FROMMonth",
                            ds160year: "tbxMILITARY_SVC_FROMYear"
                        },
                        {
                            id: "endDate",
                            label: "Data término",
                            type: "date",
                            required: true,
                            fullWidth: true,
                            ds160day: "ddlMILITARY_SVC_TODay",
                            ds160month: "ddlMILITARY_SVC_TOMonth",
                            ds160year: "tbxMILITARY_SVC_TOYear"
                        }
                    ]
                },
                {
                    id: "insurgentOrg",
                    label: "Já serviu, foi membro ou esteve envolvido com unidade paramilitar, milícia, grupo rebelde, guerrilha ou organização insurgente?",
                    type: "radio",
                    required: true,
                    ds160: "rblINSURGENT_ORG_IND"
                },
                {
                    id: "insurgentOrgExplanation",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 4000,
                    showWhen: { field: "insurgentOrg", equals: "Y" },
                    ds160: "tbxINSURGENT_ORG_EXPL"
                }
            ]
        },
        {
            id: "security",
            label: "Segurança e Antecedentes",
            fields: [
                {
                    id: "disease",
                    label: "Possui doença comunicável (ex: tuberculose)?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblDisease"
                },
                {
                    id: "diseaseExpl",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 200,
                    showWhen: { field: "disease", equals: "Y" },
                    ds160: "tbxDisease_EXPL"
                },
                {
                    id: "disorder",
                    label: "Possui distúrbio mental ou físico?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblDisorder"
                },
                {
                    id: "disorderExpl",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 200,
                    showWhen: { field: "disorder", equals: "Y" },
                    ds160: "tbxDisorder_EXPL"
                },
                {
                    id: "drugUser",
                    label: "É usuário de drogas?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblDruguser"
                },
                {
                    id: "drugUserExpl",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 200,
                    showWhen: { field: "drugUser", equals: "Y" },
                    ds160: "tbxDruguser_EXPL"
                },
                {
                    id: "arrested",
                    label: "Já foi preso ou condenado?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblArrested"
                },
                {
                    id: "arrestedExpl",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 200,
                    showWhen: { field: "arrested", equals: "Y" },
                    ds160: "tbxArrested_EXPL"
                },
                {
                    id: "controlledSubstances",
                    label: "Violou lei de substâncias controladas?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblControlledSubstances"
                },
                {
                    id: "controlledSubstancesExpl",
                    label: "Explique",
                    type: "textarea",
                    required: true,
                    maxLen: 200,
                    showWhen: { field: "controlledSubstances", equals: "Y" },
                    ds160: "tbxControlledSubstances_EXPL"
                },
                {
                    id: "prostitution",
                    label: "Envolvido em prostituição?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblProstitution"
                },
                {
                    id: "moneyLaundering",
                    label: "Envolvido em lavagem de dinheiro?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblMoneyLaundering"
                },
                {
                    id: "humanTrafficking",
                    label: "Envolvido em tráfico de pessoas?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblHumanTrafficking"
                },
                {
                    id: "assistedSevereTrafficking",
                    label: "Auxiliou tráfico severo?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblAssistedSevereTrafficking"
                },
                {
                    id: "humanTraffickingRelated",
                    label: "Parente de traficante de pessoas?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblHumanTraffickingRelated"
                },
                {
                    id: "illegalActivity",
                    label: "Pretende atividades ilegais nos EUA?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblIllegalActivity"
                },
                {
                    id: "terroristActivity",
                    label: "Envolvido em atividades terroristas?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblTerroristActivity"
                },
                {
                    id: "terroristSupport",
                    label: "Apoiou atividades terroristas?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblTerroristSupport"
                },
                {
                    id: "terroristOrg",
                    label: "Membro de organização terrorista?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblTerroristOrg"
                },
                {
                    id: "terroristRel",
                    label: "Parente de envolvido em terrorismo?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblTerroristRel"
                },
                {
                    id: "genocide",
                    label: "Envolvido em genocídio?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblGenocide"
                },
                {
                    id: "torture",
                    label: "Envolvido em tortura?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblTorture"
                },
                {
                    id: "exViolence",
                    label: "Envolvido em violência extrajudicial?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblExViolence"
                },
                {
                    id: "childSoldier",
                    label: "Recrutou crianças-soldado?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblChildSoldier"
                },
                {
                    id: "religiousFreedom",
                    label: "Violou liberdade religiosa?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblReligiousFreedom"
                },
                {
                    id: "populationControls",
                    label: "Envolvido em controle populacional forçado?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblPopulationControls"
                },
                {
                    id: "transplant",
                    label: "Envolvido em transplante forçado de órgãos?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblTransplant"
                },
                {
                    id: "removalHearing",
                    label: "Já teve audiência de remoção?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblRemovalHearing"
                },
                {
                    id: "immigrationFraud",
                    label: "Cometeu fraude imigratória?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblImmigrationFraud"
                },
                {
                    id: "failToAttend",
                    label: "Falhou em comparecer a audiência?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblFailToAttend"
                },
                {
                    id: "visaViolation",
                    label: "Violou termos do visto?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblVisaViolation"
                },
                {
                    id: "deport",
                    label: "Já foi deportado?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblDeport"
                },
                {
                    id: "childCustody",
                    label: "Detém custódia de criança de cidadão americano?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblChildCustody"
                },
                {
                    id: "votingViolation",
                    label: "Violou lei eleitoral?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblVotingViolation"
                },
                {
                    id: "renounceExp",
                    label: "Renunciou cidadania para evitar impostos?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblRenounceExp"
                },
                {
                    id: "attWoReimb",
                    label: "Participou de treinamento sem reembolso?",
                    type: "radio",
                    required: true,
                    default: "N",
                    ds160: "rblAttWoReimb"
                }
            ]
        },
        {
            id: "studentExchange",
            label: "Informações SEVIS",
            conditional: true,
            showWhen: {
                section: "travel",
                field: "purposeCategory",
                in: ["F", "J", "M"]
            },
            fields: [
                {
                    id: "sevisId",
                    label: "Número SEVIS",
                    type: "text",
                    required: true,
                    maxLen: 11,
                    uppercase: true,
                    hint: "ex: N0123456789",
                    ds160: "tbxSevisID"
                },
                {
                    id: "programNumber",
                    label: "Número do Programa",
                    type: "text",
                    required: true,
                    maxLen: 15,
                    uppercase: true,
                    hint: "ex: G-7-12345",
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: ["J1-J1", "J2-CH", "J2-SP"]
                    },
                    ds160: "tbxProgram"
                },
                {
                    id: "principalSevisId",
                    label: "SEVIS ID do Requerente Principal",
                    type: "text",
                    required: true,
                    maxLen: 11,
                    uppercase: true,
                    hint: "ex: N0123456789",
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: [
                            "F2-CH",
                            "F2-SP",
                            "J2-CH",
                            "J2-SP",
                            "M2"
                        ]
                    },
                    ds160: "tbxPrincipalSevisID"
                },
                {
                    id: "intendToStudy",
                    label: "Pretende estudar nos Estados Unidos?",
                    type: "radio",
                    required: true,
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: ["J1-J1"]
                    },
                    ds160: "rblStudyQuestion"
                },
                {
                    id: "schoolName",
                    label: "Nome da Escola",
                    type: "text",
                    required: true,
                    maxLen: 75,
                    uppercase: true,
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: ["F1-F1", "J1-J1", "M1"]
                    },
                    ds160: "tbxNameOfSchool"
                },
                {
                    id: "courseOfStudy",
                    label: "Curso de Estudo",
                    type: "text",
                    required: true,
                    maxLen: 66,
                    uppercase: true,
                    hint: "Para ensino médio: 'Academic' ou 'Vocational'. Para outros níveis: sua especialização.",
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: ["F1-F1", "J1-J1", "M1"]
                    },
                    ds160: "tbxSchoolCourseOfStudy"
                },
                {
                    id: "schoolAddress",
                    label: "Endereço da Instituição (Linha 1)",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    uppercase: true,
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: ["F1-F1", "J1-J1", "M1"]
                    },
                    ds160: "tbxSchoolStreetAddress1"
                },
                {
                    id: "schoolAddress2",
                    label: "Endereço da Instituição (Linha 2)",
                    type: "text",
                    required: false,
                    maxLen: 40,
                    uppercase: true,
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: ["F1-F1", "J1-J1", "M1"]
                    },
                    ds160: "tbxSchoolStreetAddress2"
                },
                {
                    id: "schoolCity",
                    label: "Cidade da Instituição",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    uppercase: true,
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: ["F1-F1", "J1-J1", "M1"]
                    },
                    ds160: "tbxSchoolCity"
                },
                {
                    id: "schoolState",
                    label: "Estado",
                    type: "select",
                    required: true,
                    optionsRef: "usStates",
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: ["F1-F1", "J1-J1", "M1"]
                    },
                    ds160: "ddlSchoolState"
                },
                {
                    id: "schoolZip",
                    label: "CEP (ZIP Code)",
                    type: "text",
                    required: true,
                    maxLen: 10,
                    hint: "ex: 12345 ou 12345-1234",
                    showWhen: {
                        section: "travel",
                        field: "purposeOfTrip",
                        in: ["F1-F1", "J1-J1", "M1"]
                    },
                    ds160: "tbxSchoolZIPCode"
                }
            ]
        },
        {
            id: "studentAddContact",
            label: "Contatos Adicionais (Estudante)",
            conditional: true,
            showWhen: {
                section: "travel",
                field: "purposeOfTrip",
                in: ["F1-F1", "J1-J1", "M1"]
            },
            fields: [
                {
                    id: "studentAddContactNote",
                    type: "alert",
                    alertStyle: "info",
                    label: "Você indicou que pretende estudar nos EUA. Forneça pelo menos duas pessoas de contato no seu país de residência que possam verificar as informações fornecidas. Não inclua familiares imediatos."
                },
                {
                    id: "contacts",
                    label: "Contatos",
                    type: "array",
                    minEntries: 2,
                    maxEntries: 5,
                    required: true,
                    ds160List: "dtlStudentAddPOC",
                    fields: [
                        { id: "surname", label: "Sobrenome", type: "text", required: true, maxLen: 33, uppercase: true, ds160: "tbxADD_POC_SURNAME" },
                        { id: "givenName", label: "Nome", type: "text", required: true, maxLen: 33, uppercase: true, ds160: "tbxADD_POC_GIVEN_NAME" },
                        { id: "address1", label: "Endereço (Linha 1)", type: "text", required: true, maxLen: 40, uppercase: true, ds160: "tbxADD_POC_ADDR_LN1" },
                        { id: "address2", label: "Endereço (Linha 2 — Bairro)", type: "text", required: false, maxLen: 40, uppercase: true, ds160: "tbxADD_POC_ADDR_LN2" },
                        { id: "city", label: "Cidade", type: "text", required: true, maxLen: 20, uppercase: true, ds160: "tbxADD_POC_ADDR_CITY" },
                        { id: "state", label: "Estado / Província", type: "text", required: false, maxLen: 20, uppercase: true, allowNA: true, ds160: "tbxADD_POC_ADDR_STATE" },
                        { id: "postalCode", label: "CEP / Código Postal", type: "text", required: false, maxLen: 10, allowNA: true, ds160: "tbxADD_POC_ADDR_POSTAL_CD" },
                        { id: "country", label: "País", type: "select", required: true, optionsRef: "countries", ds160: "ddlADD_POC_ADDR_CTRY" },
                        { id: "phone", label: "Telefone", type: "phone", required: false, maxLen: 15, allowNA: true, ds160: "tbxADD_POC_TEL" },
                        { id: "email", label: "E-mail", type: "email", required: false, maxLen: 50, allowNA: true, ds160: "tbxADD_POC_EMAIL_ADDR" }
                    ]
                }
            ]
        },
        {
            id: "temporaryWork",
            label: "Informações de Trabalho Temporário",
            conditional: true,
            showWhen: {
                section: "travel",
                field: "purposeCategory",
                in: [
                    "H",
                    "L",
                    "O",
                    "P",
                    "Q",
                    "R"
                ]
            },
            fields: [
                {
                    id: "petitionNumber",
                    label: "Número do Recibo/Petição",
                    type: "text",
                    required: true,
                    maxLen: 13,
                    uppercase: true,
                    hint: "ex: ABC1234567890",
                    ds160: "tbxPetitionNumber"
                },
                {
                    id: "nameOfPetitioner",
                    label: "Nome da Pessoa/Empresa que Entrou com a Petição",
                    type: "text",
                    required: true,
                    maxLen: 66,
                    uppercase: true,
                    ds160: "tbxNameOfPetitioner"
                },
                {
                    id: "employerName",
                    label: "Nome do Empregador",
                    type: "text",
                    required: true,
                    maxLen: 75,
                    uppercase: true,
                    ds160: "tbxEmployerName"
                },
                {
                    id: "employerAddress",
                    label: "Endereço nos EUA (Linha 1)",
                    type: "text",
                    required: true,
                    maxLen: 40,
                    uppercase: true,
                    ds160: "tbxEmpStreetAddress1"
                },
                {
                    id: "employerAddress2",
                    label: "Endereço nos EUA (Linha 2)",
                    type: "text",
                    required: false,
                    maxLen: 40,
                    uppercase: true,
                    ds160: "tbxEmpStreetAddress2"
                },
                {
                    id: "employerCity",
                    label: "Cidade",
                    type: "text",
                    required: true,
                    maxLen: 20,
                    uppercase: true,
                    ds160: "tbxEmpCity"
                },
                {
                    id: "employerState",
                    label: "Estado",
                    type: "select",
                    required: true,
                    optionsRef: "usStates",
                    ds160: "ddlEmpState"
                },
                {
                    id: "employerZip",
                    label: "CEP (ZIP Code)",
                    type: "text",
                    required: false,
                    maxLen: 10,
                    hint: "ex: 55555 ou 55555-5555",
                    ds160: "tbxZIPCode"
                },
                {
                    id: "employerPhone",
                    label: "Telefone",
                    type: "text",
                    required: true,
                    maxLen: 15,
                    hint: "ex: 5555555555",
                    ds160: "tbxTEMP_WORK_TEL"
                },
                {
                    id: "monthlySalary",
                    label: "Renda Mensal (em USD)",
                    type: "text",
                    required: true,
                    maxLen: 11,
                    ds160: "tbxEmpSalaryInUSD"
                }
            ]
        }
    ],
    options: {
        countries: [
            { value: "BRZL", label: "BRAZIL" },
            { value: "AFGH", label: "AFGHANISTAN" },
            { value: "ALB", label: "ALBANIA" },
            { value: "ALGR", label: "ALGERIA" },
            { value: "ANDO", label: "ANDORRA" },
            { value: "ANGL", label: "ANGOLA" },
            { value: "ANGU", label: "ANGUILLA" },
            { value: "ANTI", label: "ANTIGUA AND BARBUDA" },
            { value: "ARG", label: "ARGENTINA" },
            { value: "ARM", label: "ARMENIA" },
            { value: "ASTL", label: "AUSTRALIA" },
            { value: "AUST", label: "AUSTRIA" },
            { value: "AZR", label: "AZERBAIJAN" },
            { value: "BAMA", label: "BAHAMAS" },
            { value: "BAHR", label: "BAHRAIN" },
            { value: "BANG", label: "BANGLADESH" },
            { value: "BRDO", label: "BARBADOS" },
            { value: "BYS", label: "BELARUS" },
            { value: "BELG", label: "BELGIUM" },
            { value: "BLZ", label: "BELIZE" },
            { value: "BENN", label: "BENIN" },
            { value: "BERM", label: "BERMUDA" },
            { value: "BHU", label: "BHUTAN" },
            { value: "BOL", label: "BOLIVIA" },
            { value: "BIH", label: "BOSNIA-HERZEGOVINA" },
            { value: "BOT", label: "BOTSWANA" },
            { value: "BRNI", label: "BRUNEI" },
            { value: "BULG", label: "BULGARIA" },
            { value: "BURK", label: "BURKINA FASO" },
            { value: "BURM", label: "BURMA" },
            { value: "BRND", label: "BURUNDI" },
            { value: "CBDA", label: "CAMBODIA" },
            { value: "CMRN", label: "CAMEROON" },
            { value: "CAN", label: "CANADA" },
            { value: "CAVI", label: "CABO VERDE" },
            { value: "CAYI", label: "CAYMAN ISLANDS" },
            { value: "CAFR", label: "CENTRAL AFRICAN REPUBLIC" },
            { value: "CHAD", label: "CHAD" },
            { value: "CHIL", label: "CHILE" },
            { value: "CHIN", label: "CHINA" },
            { value: "COL", label: "COLOMBIA" },
            { value: "COMO", label: "COMOROS" },
            { value: "COD", label: "CONGO, DEMOCRATIC REPUBLIC OF THE" },
            { value: "CONB", label: "CONGO, REPUBLIC OF THE" },
            { value: "CSTR", label: "COSTA RICA" },
            { value: "IVCO", label: "COTE D`IVOIRE" },
            { value: "HRV", label: "CROATIA" },
            { value: "CUBA", label: "CUBA" },
            { value: "CYPR", label: "CYPRUS" },
            { value: "CZEC", label: "CZECH REPUBLIC" },
            { value: "DEN", label: "DENMARK" },
            { value: "DJI", label: "DJIBOUTI" },
            { value: "DOMN", label: "DOMINICA" },
            { value: "DOMR", label: "DOMINICAN REPUBLIC" },
            { value: "ECUA", label: "ECUADOR" },
            { value: "EGYP", label: "EGYPT" },
            { value: "ELSL", label: "EL SALVADOR" },
            { value: "EGN", label: "EQUATORIAL GUINEA" },
            { value: "ERI", label: "ERITREA" },
            { value: "EST", label: "ESTONIA" },
            { value: "SZLD", label: "ESWATINI" },
            { value: "ETH", label: "ETHIOPIA" },
            { value: "FIJI", label: "FIJI" },
            { value: "FIN", label: "FINLAND" },
            { value: "FRAN", label: "FRANCE" },
            { value: "GABN", label: "GABON" },
            { value: "GAM", label: "GAMBIA, THE" },
            { value: "GEO", label: "GEORGIA" },
            { value: "GER", label: "GERMANY" },
            { value: "GHAN", label: "GHANA" },
            { value: "GIB", label: "GIBRALTAR" },
            { value: "GRC", label: "GREECE" },
            { value: "GREN", label: "GRENADA" },
            { value: "GUAT", label: "GUATEMALA" },
            { value: "GNEA", label: "GUINEA" },
            { value: "GUIB", label: "GUINEA - BISSAU" },
            { value: "GUY", label: "GUYANA" },
            { value: "HAT", label: "HAITI" },
            { value: "VAT", label: "HOLY SEE (VATICAN CITY)" },
            { value: "HOND", label: "HONDURAS" },
            { value: "HOKO", label: "HONG KONG BNO" },
            { value: "HNK", label: "HONG KONG SAR" },
            { value: "HUNG", label: "HUNGARY" },
            { value: "ICLD", label: "ICELAND" },
            { value: "IND", label: "INDIA" },
            { value: "IDSA", label: "INDONESIA" },
            { value: "IRAN", label: "IRAN" },
            { value: "IRAQ", label: "IRAQ" },
            { value: "IRE", label: "IRELAND" },
            { value: "ISRL", label: "ISRAEL" },
            { value: "ITLY", label: "ITALY" },
            { value: "JAM", label: "JAMAICA" },
            { value: "JPN", label: "JAPAN" },
            { value: "JORD", label: "JORDAN" },
            { value: "KAZ", label: "KAZAKHSTAN" },
            { value: "KENY", label: "KENYA" },
            { value: "KIRI", label: "KIRIBATI" },
            { value: "PRK", label: "KOREA, DEMOCRATIC REPUBLIC OF (NORTH)" },
            { value: "KOR", label: "KOREA, REPUBLIC OF (SOUTH)" },
            { value: "KSV", label: "KOSOVO" },
            { value: "KUWT", label: "KUWAIT" },
            { value: "KGZ", label: "KYRGYZSTAN" },
            { value: "LAOS", label: "LAOS" },
            { value: "LATV", label: "LATVIA" },
            { value: "LEBN", label: "LEBANON" },
            { value: "LES", label: "LESOTHO" },
            { value: "LIBR", label: "LIBERIA" },
            { value: "LBYA", label: "LIBYA" },
            { value: "LCHT", label: "LIECHTENSTEIN" },
            { value: "LITH", label: "LITHUANIA" },
            { value: "LXM", label: "LUXEMBOURG" },
            { value: "MAC", label: "MACAU" },
            { value: "MKD", label: "MACEDONIA, NORTH" },
            { value: "MADG", label: "MADAGASCAR" },
            { value: "MALW", label: "MALAWI" },
            { value: "MLAS", label: "MALAYSIA" },
            { value: "MLDV", label: "MALDIVES" },
            { value: "MALI", label: "MALI" },
            { value: "MLTA", label: "MALTA" },
            { value: "RMI", label: "MARSHALL ISLANDS" },
            { value: "MAUR", label: "MAURITANIA" },
            { value: "MRTS", label: "MAURITIUS" },
            { value: "MEX", label: "MEXICO" },
            { value: "FSM", label: "MICRONESIA" },
            { value: "MLD", label: "MOLDOVA" },
            { value: "MON", label: "MONACO" },
            { value: "MONG", label: "MONGOLIA" },
            { value: "MTG", label: "MONTENEGRO" },
            { value: "MONT", label: "MONTSERRAT" },
            { value: "MORO", label: "MOROCCO" },
            { value: "MOZ", label: "MOZAMBIQUE" },
            { value: "NAMB", label: "NAMIBIA" },
            { value: "NAU", label: "NAURU" },
            { value: "NEP", label: "NEPAL" },
            { value: "NETH", label: "NETHERLANDS" },
            { value: "NZLD", label: "NEW ZEALAND" },
            { value: "NIC", label: "NICARAGUA" },
            { value: "NIR", label: "NIGER" },
            { value: "NRA", label: "NIGERIA" },
            { value: "NORW", label: "NORWAY" },
            { value: "OMAN", label: "OMAN" },
            { value: "PKST", label: "PAKISTAN" },
            { value: "PALA", label: "PALAU" },
            { value: "PAL", label: "PALESTINIAN AUTHORITY" },
            { value: "PAN", label: "PANAMA" },
            { value: "PNG", label: "PAPUA NEW GUINEA" },
            { value: "PARA", label: "PARAGUAY" },
            { value: "PERU", label: "PERU" },
            { value: "PHIL", label: "PHILIPPINES" },
            { value: "PITC", label: "PITCAIRN ISLANDS" },
            { value: "POL", label: "POLAND" },
            { value: "PORT", label: "PORTUGAL" },
            { value: "QTAR", label: "QATAR" },
            { value: "ROM", label: "ROMANIA" },
            { value: "RUS", label: "RUSSIA" },
            { value: "RWND", label: "RWANDA" },
            { value: "WSAM", label: "SAMOA" },
            { value: "SMAR", label: "SAN MARINO" },
            { value: "STPR", label: "SAO TOME AND PRINCIPE" },
            { value: "SARB", label: "SAUDI ARABIA" },
            { value: "SENG", label: "SENEGAL" },
            { value: "SBA", label: "SERBIA" },
            { value: "SEYC", label: "SEYCHELLES" },
            { value: "SLEO", label: "SIERRA LEONE" },
            { value: "SING", label: "SINGAPORE" },
            { value: "SVK", label: "SLOVAKIA" },
            { value: "SVN", label: "SLOVENIA" },
            { value: "SLMN", label: "SOLOMON ISLANDS" },
            { value: "SOMA", label: "SOMALIA" },
            { value: "SAFR", label: "SOUTH AFRICA" },
            { value: "SSDN", label: "SOUTH SUDAN" },
            { value: "SPN", label: "SPAIN" },
            { value: "SRL", label: "SRI LANKA" },
            { value: "SHEL", label: "ST. HELENA" },
            { value: "STCN", label: "ST. KITTS AND NEVIS" },
            { value: "SLCA", label: "ST. LUCIA" },
            { value: "STVN", label: "ST. VINCENT AND THE GRENADINES" },
            { value: "XXX", label: "STATELESS" },
            { value: "SUDA", label: "SUDAN" },
            { value: "SURM", label: "SURINAME" },
            { value: "SWDN", label: "SWEDEN" },
            { value: "SWTZ", label: "SWITZERLAND" },
            { value: "SYR", label: "SYRIA" },
            { value: "TWAN", label: "TAIWAN" },
            { value: "TJK", label: "TAJIKISTAN" },
            { value: "TAZN", label: "TANZANIA" },
            { value: "THAI", label: "THAILAND" },
            { value: "TMOR", label: "TIMOR-LESTE" },
            { value: "TOGO", label: "TOGO" },
            { value: "TONG", label: "TONGA" },
            { value: "TRIN", label: "TRINIDAD AND TOBAGO" },
            { value: "TNSA", label: "TUNISIA" },
            { value: "TRKY", label: "TURKEY" },
            { value: "TKM", label: "TURKMENISTAN" },
            { value: "TCIS", label: "TURKS AND CAICOS ISLANDS" },
            { value: "TUV", label: "TUVALU" },
            { value: "UGAN", label: "UGANDA" },
            { value: "UKR", label: "UKRAINE" },
            { value: "UAE", label: "UNITED ARAB EMIRATES" },
            { value: "GRBR", label: "UNITED KINGDOM" },
            { value: "URU", label: "URUGUAY" },
            { value: "UZB", label: "UZBEKISTAN" },
            { value: "VANU", label: "VANUATU" },
            { value: "VENZ", label: "VENEZUELA" },
            { value: "VTNM", label: "VIETNAM" },
            { value: "BRVI", label: "VIRGIN ISLANDS, BRITISH" },
            { value: "WAFT", label: "WALLIS AND FUTUNA ISLANDS" },
            { value: "SSAH", label: "WESTERN SAHARA" },
            { value: "YEM", label: "YEMEN" },
            { value: "ZAMB", label: "ZAMBIA" },
            { value: "ZIMB", label: "ZIMBABWE" }
        ],
        usStates: [
            { value: "AL", label: "Alabama" },
            { value: "AK", label: "Alaska" },
            { value: "AZ", label: "Arizona" },
            { value: "AR", label: "Arkansas" },
            { value: "CA", label: "California" },
            { value: "CO", label: "Colorado" },
            { value: "CT", label: "Connecticut" },
            { value: "DE", label: "Delaware" },
            { value: "FL", label: "Florida" },
            { value: "GA", label: "Georgia" },
            { value: "HI", label: "Hawaii" },
            { value: "ID", label: "Idaho" },
            { value: "IL", label: "Illinois" },
            { value: "IN", label: "Indiana" },
            { value: "IA", label: "Iowa" },
            { value: "KS", label: "Kansas" },
            { value: "KY", label: "Kentucky" },
            { value: "LA", label: "Louisiana" },
            { value: "ME", label: "Maine" },
            { value: "MA", label: "Massachusetts" },
            { value: "MD", label: "Maryland" },
            { value: "MI", label: "Michigan" },
            { value: "MN", label: "Minnesota" },
            { value: "MS", label: "Mississippi" },
            { value: "MO", label: "Missouri" },
            { value: "MT", label: "Montana" },
            { value: "NE", label: "Nebraska" },
            { value: "NV", label: "Nevada" },
            { value: "NH", label: "New Hampshire" },
            { value: "NJ", label: "New Jersey" },
            { value: "NM", label: "New Mexico" },
            { value: "NY", label: "New York" },
            { value: "NC", label: "North Carolina" },
            { value: "ND", label: "North Dakota" },
            { value: "OH", label: "Ohio" },
            { value: "OK", label: "Oklahoma" },
            { value: "OR", label: "Oregon" },
            { value: "PA", label: "Pennsylvania" },
            { value: "RI", label: "Rhode Island" },
            { value: "SC", label: "South Carolina" },
            { value: "SD", label: "South Dakota" },
            { value: "TN", label: "Tennessee" },
            { value: "TX", label: "Texas" },
            { value: "UT", label: "Utah" },
            { value: "VT", label: "Vermont" },
            { value: "VA", label: "Virginia" },
            { value: "WA", label: "Washington" },
            { value: "WV", label: "West Virginia" },
            { value: "WI", label: "Wisconsin" },
            { value: "WY", label: "Wyoming" },
            { value: "DC", label: "District of Columbia" }
        ],
        relationships: [
            { value: "P", label: "Pai/Mãe" },
            { value: "S", label: "Cônjuge" },
            { value: "C", label: "Filho(a)" },
            { value: "R", label: "Outro Parente" },
            { value: "F", label: "Amigo(a)" },
            { value: "B", label: "Parceiro de Negócios" },
            { value: "O", label: "Outro" }
        ],
        usContactRelationships: [
            { value: "R", label: "Parente" },
            { value: "S", label: "Cônjuge" },
            { value: "C", label: "Amigo/Amiga" },
            { value: "B", label: "Sócio/Sócia" },
            { value: "P", label: "Empregador" },
            { value: "H", label: "Oficial de Escola" },
            { value: "O", label: "Outro" }
        ],
        relativeTypes: [
            { value: "S", label: "Cônjuge" },
            { value: "F", label: "Noivo(a)" },
            { value: "C", label: "Filho(a)" },
            { value: "B", label: "Irmão/Irmã" }
        ],
        usStatus: [
            { value: "S", label: "Cidadão americano" },
            { value: "C", label: "Residente permanente (LPR)" },
            { value: "P", label: "Não-imigrante" },
            { value: "O", label: "Outro / Não sei" }
        ],
        occupations: [
            { value: "A", label: "Agricultura" },
            { value: "AP", label: "Artista/Intérprete" },
            { value: "B", label: "Negócios" },
            { value: "CM", label: "Comunicação" },
            { value: "CS", label: "Ciência da Computação" },
            { value: "C", label: "Culinária/Serviços Gastronômico" },
            { value: "ED", label: "Educação" },
            { value: "EN", label: "Engenharia" },
            { value: "G", label: "Governo" },
            { value: "H", label: "Do Lar" },
            { value: "LP", label: "Profissão Legal" },
            { value: "MH", label: "Médico/Saúde" },
            { value: "M", label: "Militar" },
            { value: "NS", label: "Ciência Natural" },
            { value: "N", label: "Desempregado" },
            { value: "PS", label: "Ciências Físicas" },
            { value: "RV", label: "Vocação Religiosa" },
            { value: "R", label: "Pesquisa" },
            { value: "RT", label: "Aposentado" },
            { value: "SS", label: "Ciência Social" },
            { value: "S", label: "Estudante" },
            { value: "O", label: "Outro" }
        ]
    }
};

/**
 * AUDITORIA COMPARATIVA: Schema vs HTML Real
 *
 * Objetivo: Encontrar divergências entre o schema do form clone
 * e o site oficial DS-160 (via ds160map/*.html)
 *
 * Uso: node scripts/audit-schema-consistency.js
 *
 * Nota: Não usa jsdom para evitar dependência. Faz parsing simples com regex.
 */

const fs = require('fs');
const path = require('path');

// Caminhos
const PROJECT_ROOT = path.join(__dirname, '..');
const PAGES_DIR = path.join(PROJECT_ROOT, 'pages');
const SCHEMA_FILE = path.join(PROJECT_ROOT, 'public', 'ds160-schema.js');
const DS160MAP_DIR = path.join(PROJECT_ROOT, 'ds160map', 'DS160');

// Carregar schema monolítico
const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf-8');
const schemaMatch = schemaContent.match(/const DS160_SCHEMA = ([\s\S]*?);\s*$/);
if (!schemaMatch) {
    console.error('❌ Não foi possível extrair DS160_SCHEMA');
    process.exit(1);
}
let schema;
try {
    schema = eval(`(${schemaMatch[1]})`);
} catch (e) {
    console.error('❌ Erro ao parsear schema:', e.message);
    process.exit(1);
}

// Mapear seções por ID
const sectionsById = {};
schema.sections.forEach(sec => {
    sectionsById[sec.id] = sec;
});

console.log(`📊 Schema carregado: ${schema.sections.length} seções`);
console.log(`   Opções: ${Object.keys(schema.options || {}).length} conjuntos`);

// Extrair IDs de campos DS-160 de um HTML (regex simples)
function extractDs160IdsFromHtml(html) {
    const ids = new Set();
    const inputs = [];

    // Regex para encontrar tags com id que começam com padrões DS-160
    // Padrões: tbx, ddl, rbl, cbex, DList, dtl
    const tagRegex = /<(input|select|textarea)[^>]*\bid\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
        const fullTag = match[0];
        const id = match[2];
        ids.add(id);

        // Tentar extrair tipo e valor
        const typeMatch = fullTag.match(/type\s*=\s*["']([^"']+)["']/i);
        const nameMatch = fullTag.match(/name\s*=\s*["']([^"']+)["']/i);
        const valueMatch = fullTag.match(/value\s*=\s*["']([^"']*)["']/i);

        inputs.push({
            id,
            type: (typeMatch ? typeMatch[1] : 'text'),
            name: nameMatch ? nameMatch[1] : '',
            value: valueMatch ? valueMatch[1] : ''
        });
    }

    // Também buscar labels próximas
    return { ids, inputs };
}

// Ler diretórios do ds160map
const ds160Pages = [
    '01-location',
    '02-personal1',
    '03-personal2',
    '04-travel',
    '05-travel-companions',
    '06-previous-us-travel',
    '07-address-phone',
    '08-passport',
    '09-us-contact',
    '10-family-parents',
    '11-family-spouse',
    '12-deceased-spouse',
    '13-prev-spouse',
    '14-work-education-current',
    '15-work-education-previous',
    '16-work-education-additional',
    '17-security'
    // Nota: 18-student-exchange, 19-petition-info podem estar em outras pastas
];

// Scan por arquivos HTML ou MD que contenham HTML
const pageFiles = {};
const allDomains = fs.readdirSync(DS160MAP_DIR, { withFileTypes: true });

allDomains.forEach(dir => {
    if (dir.isDirectory() && dir.name !== '.obsidian' && dir.name !== 'check') {
        const subPath = path.join(DS160MAP_DIR, dir.name);
        const files = fs.readdirSync(subPath);
        files.forEach(file => {
            // Identificar página pelo número no início ou pelo conteúdo
            if (file.endsWith('.html') || file.endsWith('.md')) {
                // Extrair nome da página do caminho
                const parts = [dir.name, file].join('/').toLowerCase();
                let pageMatch = parts.match(/(\d{2})-([a-z0-9-]+)/);
                if (pageMatch) {
                    const pageNum = pageMatch[1];
                    const pageName = pageMatch[2];
                    const pageKey = `${pageNum}-${pageName}`;
                    if (!pageFiles[pageKey]) {
                        pageFiles[pageKey] = [];
                    }
                    pageFiles[pageKey].push(path.join(subPath, file));
                }
            }
        });
    }
});

console.log(`   Encontrados arquivos para ${Object.keys(pageFiles).length} páginas`);

// Analisar cada página
const pageAnalysis = {};
Object.entries(pageFiles).forEach(([pageKey, files]) => {
    let allInputs = [];
    let allIds = new Set();

    files.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            const { ids, inputs } = extractDs160IdsFromHtml(content);
            allIds = new Set([...allIds, ...ids]);
            allInputs.push(...inputs);
        } catch (e) {
            console.warn(`   ⚠️ Erro ao ler ${file}: ${e.message}`);
        }
    });

    pageAnalysis[pageKey] = {
        ids: allIds,
        inputs: allInputs,
        fileCount: files.length
    };
});

console.log(`   Total de campos DS-160 identificados: ${Object.values(pageAnalysis).reduce((sum, p) => sum + p.ids.size, 0)}`);

// 2) COMPARAR COM SCHEMA
console.log('\n📋 Comparando schema vs HTML real...\n');

const discrepancies = [];
const missingInSchema = [];
const extraInSchema = [];
const ds160KeyPattern = /^(tbx|ddl|rbl|cbex|DList|dtl)/i;

// Para cada seção do schema, verificar se os ds160 IDs existem no HTML real
schema.sections.forEach(sec => {
    const secFields = sec.fields;
    const secId = sec.id;

    // Encontrar a página correspondente (ex: 'personal1' → '02-personal1')
    const pageMatch = Object.keys(pageAnalysis).find(p => p.includes(secId.replace('addressPhone', 'address-phone')));
    const realPage = pageMatch ? pageAnalysis[pageMatch] : null;

    secFields.forEach(field => {
        const ds160Key = field.ds160 || field.ds160day || field.ds160month || field.ds160year || field.ds160List;

        if (!ds160Key) {
            return;
        }

        // Para arrays, o ds160List é o prefixo (ex: 'DListAlias')
        if (field.type === 'array') {
            const listId = field.ds160List;
            if (realPage) {
                // Verificar se existe pelo menos um input com esse prefixo
                const exists = Array.from(realPage.ids).some(id => id.includes(listId));
                if (!exists) {
                    missingInSchema.push({
                        section: secId,
                        field: field.id,
                        ds160: listId,
                        page: pageMatch,
                        reason: 'Array ds160List não encontrado no HTML'
                    });
                }
            }
            return;
        }

        // Para campos date com ds160day/month/year — tratar como grupo
        if (field.type === 'date' && (field.ds160day || field.ds160month || field.ds160year)) {
            const dayId = field.ds160day;
            const monthId = field.ds160month;
            const yearId = field.ds160year;

            if (realPage) {
                [dayId, monthId, yearId].forEach(part => {
                    if (part && !realPage.ids.has(part)) {
                        missingInSchema.push({
                            section: secId,
                            field: field.id,
                            ds160: part,
                            page: pageMatch,
                            reason: 'Date part not found in HTML'
                        });
                    }
                });
            }
            return;
        }

        // Campo simples
        if (realPage) {
            if (!realPage.ids.has(ds160Key)) {
                missingInSchema.push({
                    section: secId,
                    field: field.id,
                    ds160: ds160Key,
                    page: pageMatch,
                    reason: 'ID não encontrado no HTML da página'
                });
            }
        }
    });
});

// 3) VERIFICAR CAMPOS NO HTML QUE NÃO ESTÃO NO SCHEMA
const fieldsNotInSchema = [];
Object.entries(pageAnalysis).forEach(([pageKey, page]) => {
    // Determinar qual seção corresponde a esta página
    const sec = schema.sections.find(s => pageKey.includes(s.id) || s.id.includes(pageKey.split('-')[1]));
    if (!sec) {
        // Página não mapeada no schema
        page.ids.forEach(id => {
            if (ds160KeyPattern.test(id)) {
                fieldsNotInSchema.push({
                    page: pageKey,
                    ds160Id: id,
                    reason: 'Página não mapeada no schema ou campo não definido'
                });
            }
        });
        return;
    }

    // Para cada campo DS-160 na página, verificar se existe no schema da seção
    page.inputs.forEach(input => {
        const id = input.id;
        if (!ds160KeyPattern.test(id)) return;

        // Buscar campo no schema que tenha este ds160
        let found = false;
        sec.fields.forEach(f => {
            const keys = [f.ds160, f.ds160day, f.ds160month, f.ds160year, f.ds160List].filter(Boolean);
            if (keys.includes(id)) found = true;

            // Arrays: checar se o input está dentro de um elemento cujo ID contém ds160List
            if (f.type === 'array' && f.ds160List && id.includes(f.ds160List)) {
                found = true;
            }
        });

        if (!found) {
            fieldsNotInSchema.push({
                page: pageKey,
                section: sec.id,
                ds160Id: id,
                label: input.value || '',
                reason: 'Campo no HTML não mapeado em nenhum field do schema'
            });
        }
    });
});

// 4) ANALISAR CONSTRUTOS CONDICIONAIS E ADD-ANOTHER
console.log('\n🔧 Analisando condicionais e arrays dinâmicos...\n');

const conditionalIssues = [];
const arrayIssues = [];

schema.sections.forEach(sec => {
    sec.fields.forEach(field => {
        // Verificar showWhen
        if (field.showWhen) {
            const parentKey = (field.showWhen.section || sec.id) + '.' + field.showWhen.field;
            const parentField = sec.fields.find(f => f.id === field.showWhen.field) ||
                               (field.showWhen.section && sectionsById[field.showWhen.section]?.fields.find(f => f.id === field.showWhen.field));

            if (!parentField) {
                conditionalIssues.push({
                    section: sec.id,
                    field: field.id,
                    type: 'showWhen',
                    issue: `Parent field "${field.showWhen.field}" not found in section ${field.showWhen.section || sec.id}`
                });
            }
        }

        // Verificar arrays
        if (field.type === 'array') {
            const ds160List = field.ds160List;
            if (!ds160List) {
                arrayIssues.push({
                    section: sec.id,
                    field: field.id,
                    issue: 'Array sem ds160List definido'
                });
                return;
            }

            // Verificar se subcampos têm ds160 definidos
            field.fields?.forEach(subF => {
                if (!subF.ds160 && !subF.ds160day && !subF.ds160month && !subF.ds160year) {
                    arrayIssues.push({
                        section: sec.id,
                        field: field.id,
                        subField: subF.id,
                        issue: 'Sub-field sem ds160 mapping'
                    });
                }

                // Verificar condicionais dentro do array
                if (subF.showWhen) {
                    const parentInArray = field.fields.find(f => f.id === subF.showWhen.field);
                    if (!parentInArray) {
                        arrayIssues.push({
                            section: sec.id,
                            field: field.id,
                            subField: subF.id,
                            issue: `Conditional on non-existent sibling field "${subF.showWhen.field}"`
                        });
                    }
                }
            });
        }
    });
});

// 5) VERIFICAR COERÊNCIA DE TIPOS
console.log('\n📊 Verificando tipos e mapeamentos...\n');

const typeMismatches = [];
schema.sections.forEach(sec => {
    sec.fields.forEach(f => {
        // Datas: expected ds160day/ds160month/ds160year
        if (f.type === 'date') {
            if (!f.ds160day && !f.ds160month && !f.ds160year) {
                typeMismatches.push({
                    section: sec.id,
                    field: f.id,
                    type: f.type,
                    issue: 'Date sem ds160day/ds160month/ds160year definidos'
                });
            }
        }

        // Phone: espera ds160 único
        if (f.type === 'phone' && !f.ds160) {
            typeMismatches.push({
                section: sec.id,
                field: f.id,
                type: f.type,
                issue: 'Phone sem ds160 definido'
            });
        }

        // Email
        if (f.type === 'email' && !f.ds160) {
            typeMismatches.push({
                section: sec.id,
                field: f.id,
                type: f.type,
                issue: 'Email sem ds160 definido'
            });
        }
    });
});

// 6) RESUMO
console.log('='.repeat(60));
console.log('📋 RELATÓRIO DE AUDITORIA — FORM CLONE vs DS160MAP');
console.log('='.repeat(60));

console.log(`\n📊 Estatísticas:`);
console.log(`   Schema sections: ${schema.sections.length}`);
console.log(`   Total fields: ${schema.sections.reduce((sum, s) => sum + s.fields.length, 0)}`);
console.log(`   Páginas HTML analisadas: ${Object.keys(pageAnalysis).length}`);
console.log(`   Campos DS-160 reais identificados: ${Object.values(pageAnalysis).reduce((sum, p) => sum + p.ids.size, 0)}`);

console.log(`\n❌ Problemas encontrados:`);
console.log(`   [1] Campos no schema mas NÃO encontrados no HTML real: ${missingInSchema.length}`);
console.log(`   [2] Campos no HTML mas NÃO mapeados no schema: ${fieldsNotInSchema.length}`);
console.log(`   [3] Problemas em condicionais: ${conditionalIssues.length}`);
console.log(`   [4] Problemas em arrays: ${arrayIssues.length}`);
console.log(`   [5] Inconsistências de tipo: ${typeMismatches.length}`);

// Exibir amostras
if (missingInSchema.length > 0) {
    console.log('\n⚠️  Exemplos de campos faltando no HTML (schema → HTML):');
    missingInSchema.slice(0, 5).forEach(item => {
        console.log(`   • ${item.section}.${item.field} → ds160="${item.ds160}" (${item.reason})`);
    });
    if (missingInSchema.length > 5) console.log(`   ... e mais ${missingInSchema.length - 5} itens`);
}

if (fieldsNotInSchema.length > 0) {
    console.log('\n⚠️  Exemplos de campos no HTML sem mapeamento (HTML → schema):');
    fieldsNotInSchema.slice(0, 5).forEach(item => {
        console.log(`   • ${item.page}: ${item.ds160Id} — "${item.label?.substring(0, 30)}..."`);
    });
    if (fieldsNotInSchema.length > 5) console.log(`   ... e mais ${fieldsNotInSchema.length - 5} itens`);
}

if (conditionalIssues.length > 0) {
    console.log('\n⚠️  Problemas de condicionais:');
    conditionalIssues.slice(0, 5).forEach(issue => {
        console.log(`   • ${issue.section}.${issue.field}: ${issue.issue}`);
    });
}

if (arrayIssues.length > 0) {
    console.log('\n⚠️  Problemas de arrays:');
    arrayIssues.slice(0, 5).forEach(issue => {
        console.log(`   • ${issue.section}.${issue.field}${issue.subField ? '.' + issue.subField : ''}: ${issue.issue}`);
    });
}

// 7) IMPACTO NO SALVAMENTO
console.log('\n💾 Impacto no salvamento no banco:');
console.log('   Se houver campos no schema que não existem no site oficial,');
console.log('   o JSON gerado pode conter dados que NÃO são preenchidos na automação.');
console.log('   Se houver campos no site que NÃO estão no schema, dados reais do');
console.log('   formulário são PERDIDOS (não salvos, não exibidos na edição).');

if (fieldsNotInSchema.length > 10) {
    console.log('\n🚨 ALERTA: MUITOS CAMPOS FALTANDO NO SCHEMA!');
    console.log('   A edição de formulários salvos vai parecer incompleta.');
    console.log('   O usuário pode ter preenchido algo que some ao reabrir.');
}

// 8) RECOMENDAÇÕES
console.log('\n🔧 Recomendações de correção:');
console.log('   1. Para cada campo faltando no schema: adicionar ao pages/XX/schema.js');
console.log('   2. Para cada campo no schema que não existe no HTML: remover ou marcar como "internal"');
console.log('   3. Verificar se todos os ds160List de arrays batem com os IDs reais no HTML (DListAlias, dtlTravelLoc, etc.)');
console.log('   4. Testar generateJSON com dados reais e verificar se o JSON exportado contém TUDO que o usuário preencheu');
console.log('   5. Testar loadData com JSON salvo anteriormente — todos os campos aparecem na UI?');
console.log('   6. Validar condicionais showWhen — os campos surgem/sombreiam corretamente?');

// Salvar relatório
const report = {
    generatedAt: new Date().toISOString(),
    stats: {
        schemaSections: schema.sections.length,
        totalSchemaFields: schema.sections.reduce((sum, s) => sum + s.fields.length, 0),
        pagesAnalyzed: Object.keys(pageAnalysis).length,
        realDs160Fields: Object.values(pageAnalysis).reduce((sum, p) => sum + p.ids.size, 0)
    },
    missingInSchema,
    fieldsNotInSchema,
    conditionalIssues,
    arrayIssues,
    typeMismatches
};

const reportFile = path.join(PROJECT_ROOT, 'audit-schema-consistency.json');
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
console.log(`\n📄 Relatório JSON salvo em: ${reportFile}`);

// Exit code se houver problemas críticos
const criticalCount = fieldsNotInSchema.length + missingInSchema.length;
process.exit(criticalCount > 20 ? 1 : 0);

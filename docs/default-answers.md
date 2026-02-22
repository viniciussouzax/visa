# Respostas Padrão DS-160

> Respostas fixas que **nunca mudam** independente do perfil do candidato.
> A automação e o clone devem respeitar estes valores como constantes.

---

## 🔐 Segurança (Landing Page)

| Campo | ID Oficial | Resposta Padrão |
|-------|-----------|----------------|
| Security Answer | `txtAnswer` | **VO** |

---

## 📝 Personal1

| Campo | ID Oficial | Resposta Padrão |
|-------|-----------|----------------|
| Telecode? | `rblTelecodeQuestion` | **N (Não)** |

---

## 🛡️ Security Pages (1–5) — Todas as perguntas

| Resposta Padrão | Observação |
|----------------|-----------|
| **N (Não)** para TODAS | São ~40 perguntas sim/não. Sempre "Não". |

### Security1 — Doença / Crime
- Doença contagiosa? → **Não**
- Distúrbio mental? → **Não**
- Usuário/dependente de drogas? → **Não**
- Preso/condenado por crime? → **Não**
- Violou leis de substâncias controladas? → **Não**
- Pretende se prostituir? → **Não**
- Envolvido em lavagem de dinheiro? → **Não**
- Envolvido em tráfico humano? → **Não**
- Ajudou em tráfico humano (parente)? → **Não**

### Security2 — Espionagem / Terrorismo
- Atividades de espionagem/sabotagem? → **Não**
- Atividades terroristas? → **Não**
- Apoio financeiro ao terrorismo? → **Não**
- Membro de organização terrorista? → **Não**
- Filho de traficante/terrorista? → **Não**
- Participou de genocídio/tortura? → **Não**
- Participou de execuções extrajudiciais? → **Não**
- Recrutou/usou crianças-soldado? → **Não**

### Security3 — Direitos Humanos
- Violou liberdade religiosa? → **Não**
- Controle populacional coercivo? → **Não**
- Transplante de órgãos coercivo? → **Não**

### Security4 — Imigração
- Audiência de remoção/deportação? → **Não**
- Fraude de imigração? → **Não**
- Não compareceu à audiência? → **Não**
- Violou termos do visto? → **Não**
- Foi deportado? → **Não**

### Security5 — Diversos
- Custódia ilegal de menor? → **Não**
- Votou ilegalmente nos EUA? → **Não**
- Renunciou cidadania americana para evitar impostos? → **Não**

---

## 📊 Lógica de Páginas por Perfil

### Páginas condicionais baseadas em Estado Civil

| Estado Civil | Family2 (Cônjuge) | PrevSpouse |
|-------------|-------------------|------------|
| S (Solteiro) | ❌ Oculta | ❌ Oculta |
| M (Casado) | ✅ Visível | ❌ Oculta |
| C (União Estável) | ✅ Visível | ❌ Oculta |
| P (União Civil) | ✅ Visível | ❌ Oculta |
| D (Divorciado) | ✅ Visível | ✅ Visível |
| W (Viúvo) | ✅ Visível | ✅ Visível |
| L (Separado) | ✅ Visível | ✅ Visível |
| O (Outro) | ✅ Visível | ❌ Oculta |

### Páginas condicionais baseadas em Idade/Gênero

| Condição | WorkEducation3 (campos extras) | Observação |
|---------|-------------------------------|-----------|
| Homem adulto (≥16) | Todos os campos | Formulário completo |
| Mulher adulta (≥16) | Todos os campos | Igual ao homem |
| Menor 14-15 anos | Sem emprego atual/anterior | Menos campos work/education |
| Menor <14 anos | Mínimo de campos | Sem work/education, sem security detalhada |

> **Nota:** O formulário oficial usa a data de nascimento para determinar a idade
> e ocultar/mostrar seções automaticamente. O clone deve replicar essa lógica.

---

## 🔄 Impacto na Automação

O arquivo `build-field-map.ts` já utiliza condicionais para campos variáveis.
Para respostas fixas, o `fill-form.ts` deve usar os valores deste documento.

```typescript
// Constantes padrão (nunca mudam)
const DEFAULTS = {
  securityAnswer: "VO",
  telecode: false,          // rblTelecodeQuestion = "N"
  securityAnswers: "ALL_NO" // Todas as perguntas de segurança = Não
};
```

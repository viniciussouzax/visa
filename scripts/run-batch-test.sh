#!/bin/bash
# ============================================================
# run-batch-test.sh — Comandos para testes em massa no Cloud Run
#
# Pré-requisitos:
#   - gcloud CLI configurado (gcloud auth login)
#   - Projeto GCP configurado (gcloud config set project XXX)
#   - Cloud Run Job "ds160-worker" já existente (deploy.yml faz isso)
#
# Uso:
#   # No Cloud Shell ou terminal local com gcloud
#   bash scripts/run-batch-test.sh seed       → insere perfis de teste
#   bash scripts/run-batch-test.sh run        → executa todos (parallelism=5)
#   bash scripts/run-batch-test.sh run5       → executa batch de 5
#   bash scripts/run-batch-test.sh logs       → mostra logs da última execução
#   bash scripts/run-batch-test.sh status     → relatório de resultados
#   bash scripts/run-batch-test.sh rerun      → re-testa apenas os fails
#   bash scripts/run-batch-test.sh clean      → remove perfis de teste
#   bash scripts/run-batch-test.sh full       → seed + run + status (ciclo completo)
# ============================================================

REGION="${GCP_REGION:-us-central1}"
JOB_NAME="${JOB_NAME:-ds160-worker}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""
}

case "${1:-help}" in
    seed)
        header "🧪 Inserindo perfis de teste"
        node scripts/seed-test-profiles.js --clean
        ;;

    seed-only)
        header "🧪 Inserindo perfis específicos"
        shift
        node scripts/seed-test-profiles.js --clean --only="$1"
        ;;

    run)
        header "🚀 Executando TODOS os perfis (parallelism=5)"
        # Count test profiles
        COUNT=$(node -e "const {PROFILES} = require('./scripts/test-profiles'); console.log(Object.keys(PROFILES).length)")
        echo -e "  Tasks: ${GREEN}${COUNT}${NC}"
        echo -e "  Parallelism: ${GREEN}5${NC}"
        echo -e "  Region: ${GREEN}${REGION}${NC}"
        echo ""
        gcloud run jobs execute "$JOB_NAME" \
            --tasks="$COUNT" \
            --parallelism=5 \
            --region="$REGION" \
            --wait
        ;;

    run5)
        header "🚀 Executando batch de 5 perfis"
        node scripts/seed-test-profiles.js --clean --batch=5
        gcloud run jobs execute "$JOB_NAME" \
            --tasks=5 \
            --parallelism=5 \
            --region="$REGION" \
            --wait
        ;;

    logs)
        header "📋 Logs da última execução"
        # Get latest execution
        EXEC=$(gcloud run jobs executions list \
            --job="$JOB_NAME" \
            --region="$REGION" \
            --format='value(name)' \
            --limit=1)
        if [ -z "$EXEC" ]; then
            echo -e "${RED}Nenhuma execução encontrada${NC}"
            exit 1
        fi
        echo -e "Execução: ${GREEN}${EXEC}${NC}"
        echo ""
        gcloud run jobs executions logs "$EXEC" --region="$REGION"
        ;;

    logs-tail)
        header "📋 Logs em tempo real (tail)"
        EXEC=$(gcloud run jobs executions list \
            --job="$JOB_NAME" \
            --region="$REGION" \
            --format='value(name)' \
            --limit=1)
        if [ -z "$EXEC" ]; then
            echo -e "${RED}Nenhuma execução encontrada${NC}"
            exit 1
        fi
        echo -e "Execução: ${GREEN}${EXEC}${NC}"
        echo ""
        gcloud run jobs executions logs "$EXEC" --region="$REGION" --tail
        ;;

    status)
        header "📊 Relatório de resultados"
        node scripts/check-test-results.js
        ;;

    status-errors)
        header "📊 Relatório com detalhes de erros"
        node scripts/check-test-results.js --errors
        ;;

    rerun)
        header "♻️ Re-testando perfis com erro"
        node scripts/check-test-results.js --reseed
        echo ""
        echo -e "${YELLOW}Execute o comando acima para re-seed e depois:${NC}"
        echo -e "  bash scripts/run-batch-test.sh run"
        ;;

    clean)
        header "🧹 Limpando perfis de teste"
        node scripts/seed-test-profiles.js --clean-only
        ;;

    full)
        header "🔄 Ciclo completo: seed → run → status"
        echo "Passo 1/3: Seed"
        node scripts/seed-test-profiles.js --clean
        echo ""
        echo "Passo 2/3: Execute"
        COUNT=$(node -e "const {PROFILES} = require('./scripts/test-profiles'); console.log(Object.keys(PROFILES).length)")
        gcloud run jobs execute "$JOB_NAME" \
            --tasks="$COUNT" \
            --parallelism=5 \
            --region="$REGION" \
            --wait
        echo ""
        echo "Passo 3/3: Status"
        node scripts/check-test-results.js
        ;;

    list)
        header "📋 Perfis disponíveis"
        node scripts/seed-test-profiles.js --list
        ;;

    help|*)
        header "DS-160 Batch Test Runner"
        echo "  Comandos disponíveis:"
        echo ""
        echo "  ${CYAN}seed${NC}           Insere todos os perfis de teste no Supabase"
        echo "  ${CYAN}seed-only${NC} X,Y  Insere apenas perfis específicos"
        echo "  ${CYAN}run${NC}            Executa todos (parallelism=5)"
        echo "  ${CYAN}run5${NC}           Seed + executa batch de 5"
        echo "  ${CYAN}logs${NC}           Mostra logs da última execução"
        echo "  ${CYAN}logs-tail${NC}      Logs em tempo real"
        echo "  ${CYAN}status${NC}         Relatório de resultados"
        echo "  ${CYAN}status-errors${NC}  Relatório com detalhes dos erros"
        echo "  ${CYAN}rerun${NC}          Mostra comando para re-testar fails"
        echo "  ${CYAN}clean${NC}          Remove todos os perfis de teste"
        echo "  ${CYAN}full${NC}           Ciclo completo: seed → run → status"
        echo "  ${CYAN}list${NC}           Lista perfis disponíveis"
        echo ""
        echo "  Exemplos:"
        echo "    bash scripts/run-batch-test.sh seed"
        echo "    bash scripts/run-batch-test.sh run"
        echo "    bash scripts/run-batch-test.sh status-errors"
        echo ""
        ;;
esac

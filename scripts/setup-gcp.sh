#!/bin/bash
# ============================================================
# setup-gcp.sh — Configura TODO o ambiente GCP do zero
#
# Execute no Cloud Shell do Google (https://shell.cloud.google.com)
#
# O que este script faz:
#   1. Habilita APIs necessárias (Cloud Run, Artifact Registry)
#   2. Cria repositório no Artifact Registry
#   3. Cria Service Account para GitHub Actions
#   4. Configura Workload Identity Federation (GitHub ↔ GCP)
#   5. Imprime as secrets para adicionar no GitHub
# ============================================================

set -e

# ── CONFIG ──
# Altere estas variáveis conforme necessário
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
AR_REPO="ds160-workers"
SA_NAME="github-actions"
SA_DISPLAY="GitHub Actions CI/CD"
GITHUB_ORG="viniciussouzax"
GITHUB_REPO="visa"
WIF_POOL="github-pool"
WIF_PROVIDER="github-provider"

echo ""
echo "═══════════════════════════════════════════════"
echo "  🚀 Setup GCP — DS-160 Cloud Run Jobs"
echo "═══════════════════════════════════════════════"
echo ""
echo "  Project ID:   $PROJECT_ID"
echo "  Region:       $REGION"
echo "  GitHub Repo:  $GITHUB_ORG/$GITHUB_REPO"
echo ""

# ── PASSO 1: Habilitar APIs ──
echo "📦 Passo 1/6: Habilitando APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --quiet

echo "  ✅ APIs habilitadas"

# ── PASSO 2: Criar Artifact Registry ──
echo ""
echo "📦 Passo 2/6: Criando Artifact Registry..."
if gcloud artifacts repositories describe $AR_REPO --location=$REGION &>/dev/null; then
  echo "  ✅ Repositório '$AR_REPO' já existe"
else
  gcloud artifacts repositories create $AR_REPO \
    --repository-format=docker \
    --location=$REGION \
    --description="DS-160 Worker Docker Images"
  echo "  ✅ Repositório '$AR_REPO' criado"
fi

# ── PASSO 3: Criar Service Account ──
echo ""
echo "👤 Passo 3/6: Criando Service Account..."
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe $SA_EMAIL &>/dev/null; then
  echo "  ✅ Service Account '$SA_NAME' já existe"
else
  gcloud iam service-accounts create $SA_NAME \
    --display-name="$SA_DISPLAY" \
    --description="CI/CD para GitHub Actions - deploy no Cloud Run"
  echo "  ✅ Service Account '$SA_NAME' criada"
fi

# ── PASSO 4: Atribuir permissões ──
echo ""
echo "🔑 Passo 4/6: Atribuindo permissões..."
ROLES=(
  "roles/run.admin"
  "roles/artifactregistry.writer"
  "roles/iam.serviceAccountUser"
  "roles/storage.admin"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" \
    --quiet &>/dev/null
  echo "  ✅ $ROLE"
done

# ── PASSO 5: Configurar Workload Identity Federation ──
echo ""
echo "🔗 Passo 5/6: Configurando Workload Identity Federation..."

# Criar pool
if gcloud iam workload-identity-pools describe $WIF_POOL --location="global" &>/dev/null; then
  echo "  ✅ Pool '$WIF_POOL' já existe"
else
  gcloud iam workload-identity-pools create $WIF_POOL \
    --location="global" \
    --display-name="GitHub Actions Pool" \
    --description="Pool para autenticação de GitHub Actions"
  echo "  ✅ Pool '$WIF_POOL' criado"
fi

# Criar provider
POOL_ID=$(gcloud iam workload-identity-pools describe $WIF_POOL --location="global" --format="value(name)")

if gcloud iam workload-identity-pools providers describe $WIF_PROVIDER \
  --workload-identity-pool=$WIF_POOL --location="global" &>/dev/null; then
  echo "  ✅ Provider '$WIF_PROVIDER' já existe"
else
  gcloud iam workload-identity-pools providers create-oidc $WIF_PROVIDER \
    --workload-identity-pool=$WIF_POOL \
    --location="global" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='${GITHUB_ORG}/${GITHUB_REPO}'"
  echo "  ✅ Provider '$WIF_PROVIDER' criado"
fi

# Vincular SA ao pool
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}" \
  --quiet &>/dev/null
echo "  ✅ SA vinculada ao GitHub repo"

# ── PASSO 6: Gerar valores das secrets ──
echo ""
echo "═══════════════════════════════════════════════"
echo "  📋 SECRETS PARA ADICIONAR NO GITHUB"
echo "═══════════════════════════════════════════════"
echo ""

PROVIDER_NAME=$(gcloud iam workload-identity-pools providers describe $WIF_PROVIDER \
  --workload-identity-pool=$WIF_POOL --location="global" --format="value(name)")

echo "  GCP_PROJECT_ID:"
echo "  $PROJECT_ID"
echo ""
echo "  GCP_SERVICE_ACCOUNT:"
echo "  $SA_EMAIL"
echo ""
echo "  GCP_WORKLOAD_IDENTITY:"
echo "  $PROVIDER_NAME"
echo ""
echo "  SUPABASE_URL:"
echo "  (copie do seu .env local)"
echo ""
echo "  SUPABASE_KEY:"
echo "  (copie do seu .env local)"
echo ""
echo "═══════════════════════════════════════════════"
echo ""
echo "  ✅ Setup completo! Próximos passos:"
echo ""
echo "  1. Adicione as 5 secrets no GitHub:"
echo "     https://github.com/$GITHUB_ORG/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "  2. Faça git push para main (dispara deploy automático)"
echo ""
echo "  3. Execute o job de testes:"
echo "     gcloud run jobs execute ds160-worker \\"
echo "       --tasks=39 --parallelism=10 \\"
echo "       --region=$REGION --wait"
echo ""

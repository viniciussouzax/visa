/** 20-photo-upload — Foto para o Visto (condicional: PTA, RCF) */
export default {
    id: "photoUpload",
    label: "Foto para o Visto",
    conditional: true,
    showWhen: {
        section: "location",
        field: "location",
        in: ["PTA", "RCF"]
    },
    fields: [
        {
            id: "photoInfo",
            type: "alert",
            alertStyle: "info",
            label: "Para esta localidade, é necessário enviar uma foto digital antes de finalizar o requerimento. A foto deve ser em formato JPEG, com no máximo 240kb, seguindo os padrões de foto de visto do Departamento de Estado dos EUA."
        },
        {
            id: "photoRequirements",
            type: "alert",
            alertStyle: "warning",
            label: "A partir de 1º de novembro de 2016, óculos NÃO são mais permitidos em novas fotos de visto."
        },
        {
            id: "photo",
            label: "Foto (JPEG, máx 240kb)",
            type: "file",
            required: false,
            accept: "image/jpeg",
            maxSizeKb: 240,
            hint: "Selecione uma foto em formato JPEG (.jpg) que seja de no máximo 240 Kb.",
            ds160: "ctl00_cphMain_imageFileUpload"
        }
    ]
};

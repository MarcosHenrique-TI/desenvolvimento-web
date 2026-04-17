#include <stdio.h>
int main ()
{
int aluno;
int contador = 1;
char linha[100];
float n1, n2, n3 , media, opcao;
FILE *arquivo;


arquivo = fopen("notas.txt", "r");
 if (arquivo != NULL) {
        while (fgets(linha, sizeof(linha), arquivo)) {
            contador++;
        }
        fclose(arquivo);
    }

printf("\n--- Lancamento do Aluno %d ---\n", contador);
printf("Digite a nota 1: ");
scanf("%f", &n1);
printf("Digite a nota 2: ");
scanf("%f", &n2);
printf("Digite a nota 3: ");
scanf("%f", &n3);


if (n1 < 0 || n1 > 10 || n2 < 0 || n2 > 10 || n3 < 0 || n3 > 10)
{
    printf("Nota invalida. As notas devem ser entre 0 e 10.");
    return 1;
}


media = (n1 + n2 + n3) / 3;

 arquivo = fopen("notas.txt", "a");
    if (arquivo != NULL) {
        fprintf(arquivo, "Aluno %d - Media: %.2f\n", contador, media);
        fclose(arquivo);
    }
    
if (media >= 7)
{
    printf("Aluno aprovado com media %.2f\n", media);
}
else if (media >= 5 && media < 7)
{
    printf("Aluno em exame com media %.2f\n", media);
}
else
{
    printf("Aluno reprovado com media %.2f\n", media);
}


while (opcao != 1 && opcao != 2)
{
    printf("Digite 1 para calcular a media de outro aluno ou 2 para sair: ");
    scanf("%f", &opcao);
    if (opcao == 1)
    {
        main();
    }
    else if (opcao == 2)
    {
        printf("Notas dos alunos: %d - Media: %.2f\n", (int)aluno, media);
        break;
    }
    else
    {
        printf("Opcao invalida. Digite 1 ou 2.\n");
    }
}
return 0;
}
#include <stdio.h>
int main(){
float prova1[3], prova2[3], prova3[3];
float soma1 = 0, soma2 = 0, soma3 = 0;
float mediaProva1, mediaProva2, mediaProva3;
float mediaAluno, somaMediaAlunos = 0;
float mediaTurma;
int i;

printf("====Digite a nota dos Alunos====\n");
for (i=0; i < 3 ; i++){
    scanf("%f", &prova1[i]);
    scanf("%f", &prova2[i]);
    scanf("%f", &prova3[i]);

    mediaAluno= (prova1[i]+ prova2[i]+ prova3[i]) / 3;
        printf("Media do Aluno: %.2f\n", mediaAluno);

    soma1= soma1+prova1[i];
    soma2= soma2+prova2[i];
    soma3= soma3+prova3[i];

    somaMediaAlunos= somaMediaAlunos + mediaAluno;
}
    mediaProva1= soma1/3;
    mediaProva2= soma2/3;
    mediaProva3= soma3/3;

    mediaTurma=somaMediaAlunos/3;
//PRINTS DAS NOTAS//
printf("Media Prova 1: %.2f\n", mediaProva1);
printf("Media Prova 2: %.2f\n", mediaProva2);
printf("Media Prova 3: %.2f\n", mediaProva3);
printf("Media da Turma : %.2f\n", mediaTurma);



    return 0;
}
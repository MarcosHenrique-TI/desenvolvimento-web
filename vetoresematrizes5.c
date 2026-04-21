#include <stdio.h>
int main(){

    const int tamvet = 50;
    int vetor[tamvet], numeroBusca[10], i, i2, achou = 0;

    printf("Vetor : ");
    for (i = 0; i< 50; i++){
        scanf("%d", &vetor[i]);
    }

    printf("\nDigite os Numeros que deseja buscar: ");

    for (i=0 ; i<10 ; i++){
        scanf("%d", &numeroBusca[i]);
    }

    for (i2=0; i2<10; i2++ ){
        achou = 0;
       for (i=0; i<50; i++) {
        if (vetor[i] == numeroBusca[i2]){
            achou = 1;
           if (achou == 1){
           printf("O seu número está na posição %d \n", i);
        }
    }
}
 if(achou == 0){
        printf("Seu numero não foi encontrado");
    }
}
return 0;
}

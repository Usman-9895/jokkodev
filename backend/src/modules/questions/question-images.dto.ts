import {ApiProperty} from '@nestjs/swagger';
export class QuestionImageDto {
  @ApiProperty({format:'uuid'}) id!:string;
  @ApiProperty({description:'URL API, accès réévalué à chaque lecture ; jamais une URL statique.'}) url!:string;
}
export class PreparedQuestionImageDto extends QuestionImageDto {
  @ApiProperty({format:'date-time',description:'Préparation privée huit jours, sans prolongation. Aucune conservation hors connexion.'}) expiresAt!:string;
}

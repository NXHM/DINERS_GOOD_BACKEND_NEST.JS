import {connectionManager,ConnectionType} from 'src/shared/db_manager';
import { CardDto, TypesOfCard } from '../dto/card.dto';
import { error } from 'console';

export class CardRepository {
    dinersGoodPool : any;
    constructor(){
        this.initializeDatabaseConnections();
    }
    private async initializeDatabaseConnections() {
        try {
          this.dinersGoodPool = await connectionManager.instancePoolConnection(ConnectionType.DINERS_GOOD);
        } catch (error) {
          console.error('Failed to initialize database connections', error);
        }
    }

    async findAllByUserId(userId: number): Promise<CardDto[]> {
        const query = `
            SELECT * FROM cards
            WHERE user_id = $1;
        `;
        const value = [userId];
       
        try {
            const result = await this.dinersGoodPool.query(query, value);
            const cards: CardDto[] = result.rows.map((row: { id: number; cardnumber: string; fourdigitcardnumber: string; expiration_date: string; cardholdername: string; cardtype: TypesOfCard; securitycode: string; cash: number; }) => {
                const cardDto = new CardDto();
                cardDto.id = row.id;
                cardDto.cardNumber = row.cardnumber;
                cardDto.fourDigitCardNumber = row.fourdigitcardnumber;
                cardDto.expirationDate = row.expiration_date; 
                cardDto.cardHolderName = row.cardholdername;
                cardDto.cardType = row.cardtype;
                cardDto.securityCode = row.securitycode;
                cardDto.cash = row.cash;
                return cardDto;
            });
            return cards;
        } catch (error) {
            console.error('Failed to find cards by user id: ', error);
            throw new Error('Failed to find cards');
        }
    }
    
    async addCardForUser(userId: number, cardDto: CardDto): Promise<CardDto> {
        const query = `
            INSERT INTO cards (user_id, cardnumber, fourDigitCardNumber, expiration_date, cardholdername, cardtype, securitycode, cash)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;

        const values = [
            userId,
            cardDto.cardNumber,
            cardDto.fourDigitCardNumber,
            cardDto.expirationDate,
            cardDto.cardHolderName,
            cardDto.cardType,
            cardDto.securityCode,
            cardDto.cash,
        ];

    
        try {
            const result = await this.dinersGoodPool.query(query, values);
            const row = result.rows[0];
            const insertedCard = new CardDto();
            insertedCard.id = row.id;
            insertedCard.cardNumber = row.cardnumber;
            insertedCard.fourDigitCardNumber = row.fourDigitCardNumber;
            insertedCard.expirationDate = row.expiration_date;
            insertedCard.cardHolderName = row.cardholdername;
            insertedCard.cardType = row.cardtype;
            insertedCard.securityCode = row.securitycode;
            insertedCard.cash = row.cash;
    
            console.log('Card added successfully');
            return insertedCard;
        } catch (error) {
            console.error('Failed to add card: ', error);
            throw new Error('Failed to add card');
        }
    }

}
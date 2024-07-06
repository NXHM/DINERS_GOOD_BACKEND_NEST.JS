import { error } from "console";
import { UserDto } from "../dto/user.dto";
import {connectionManager,ConnectionType} from 'src/shared/db_manager';
import * as bcrypt from 'bcrypt';
import { CardRepository } from "./card-repository";

export class UserRepository {
    dinersGoodPool : any;
    private readonly cardRepository: CardRepository
    constructor(){
        this.initializeDatabaseConnections();
        this.cardRepository = new CardRepository();
    }

    private async initializeDatabaseConnections() {
        try {
          this.dinersGoodPool = await connectionManager.instancePoolConnection(ConnectionType.DINERS_GOOD);
        } catch (error) {
          console.error('Failed to initialize database connections', error);
        }
    }
    
    async saveUser(user: UserDto): Promise<UserDto> {
        const userQuery = `
            INSERT INTO users (username, password, type_of_document, number_of_document, email, phone)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const valuesUser = [
            user.username,
            user.password,
            user.typeOfDocument,
            user.numberOfDocument,
            user.email,
            user.phone
        ];

        try {
           
            await this.dinersGoodPool.query('BEGIN');
            const userResult = await this.dinersGoodPool.query(userQuery, valuesUser);
            const newUser = new UserDto(userResult.rows[0]);

            for (const card of user.cards) {
                const cardQuery = `
                    INSERT INTO cards (user_id, cardNumber, fourDigitCardNumber,expiration_date, cardHolderName, cardType, securityCode)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *;    
                `;
                const valuesCard = [
                    newUser.id,
                    card.cardNumber,
                    card.fourDigitCardNumber,
                    card.expirationDate,
                    card.cardHolderName,
                    card.cardType,
                    card.securityCode
                ];
                const cardResult = await this.dinersGoodPool.query(cardQuery, valuesCard);
                newUser.cards.push(cardResult.rows[0]);
            }
    
            await this.dinersGoodPool.query('COMMIT');
            
            return newUser;
        } catch (error) {
            await this.dinersGoodPool.query('ROLLBACK');
            console.error('Failed to save user: ', error);
            throw new Error('Failed to save user');
        }
    }

   

    async findOneWithUsernameAndPassword(username: string, password: string): Promise<UserDto | null> {
        const query = `
            SELECT * FROM users WHERE username=$1;
        `;
        const values = [username];
        try {
            const result = await this.dinersGoodPool.query(query,values);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    return new UserDto(user);
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } catch (error) {
            console.error('Failed to find user: ', error);
            throw new Error('Failed to find user');
        }
    }

    async findByUsername(username:string): Promise<UserDto | null>{
        const query = `
            SELECT * FROM users WHERE username=$1;
        `;
        const values = [username];
        try{
            const result = await this.dinersGoodPool.query(query, values);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                return new UserDto(user);
            } else {
                return null;
            }
        }catch (error) {
            console.error('Failed to find user: ', error);
            throw new Error('Failed to find user');
        }
    }

    async findUserById(id:number): Promise<UserDto>{
        const userQuery = `SELECT * FROM users WHERE id=$1`;
        const values = [id];
        try{
            const userResult = await this.dinersGoodPool.query(userQuery, values);
            if (userResult.rows.length === 0) {
                throw new Error(`User with ID ${id} not found`);
            }
            const userDto = new UserDto(userResult.rows[0]);
            userDto.cards = await this.cardRepository.findAllByUserId(id);
            return userDto;
        }catch(error){
            console.error("Failed to find user: ", error);
            throw error;
        }
    }

}
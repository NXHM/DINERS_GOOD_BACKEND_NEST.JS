import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/infrastructure/repositories/user-repository';
import { TypesDocument, UserDto } from 'src/infrastructure/dto/user.dto';
import { JwtService } from '@nestjs/jwt';
import { CardRepository } from 'src/infrastructure/repositories/card-repository';
import { CardDto, TypesOfCard } from 'src/infrastructure/dto/card.dto';
import * as bcrypt from 'bcrypt';
const luhn = require("luhn");

@Injectable()
export class UsuarioService {
    private readonly userRepository: UserRepository;
    private readonly cardRepository: CardRepository;

    constructor(private readonly jwtService: JwtService) {
        this.userRepository = new UserRepository();
        this.cardRepository = new CardRepository();

    }

    async getProfile(token: string): Promise<UserDto> {
        try {
            const decodedToken = await this.jwtService.verifyAsync(token);
            const userId = decodedToken.sub;
            const user = await this.userRepository.findUserById(userId);
            if (!user) {
                console.log('Invalid user');
            }
            return user;
        } catch (error) {
            console.log('Invalid token');
        }
    }

    async addCard(token: string, cardDto: CardDto): Promise<CardDto> {
        try {
            const decodedToken = await this.jwtService.verifyAsync(token);
            const userId = decodedToken.sub;
            const user = await this.userRepository.findUserById(userId);
            if (!user) {
                console.log('Invalid user');
            }
            if (cardDto.cardNumber.length != 16) {
                console.log("Invalid card number");
            }

            if (cardDto.expirationDate) {
                let fields = cardDto.expirationDate.split('/');
                if (fields.length !== 2) {
                    console.log("Invalid Date Format: Date should be in 'month/year' format");
                }
                if (parseInt(fields[0]) > 12) {
                    console.log("Invalid Date");
                }
            }

            if (!cardDto.cardHolderName) {
                console.log("Card holder name is required");
            }

            if (!cardDto.cardType) {
                console.log("Card type is required");
            }

            const validCardTypes = Object.values(TypesOfCard);
            if (!validCardTypes.includes(cardDto.cardType.toUpperCase() as TypesOfCard)) {
                console.log("Invalid card type");
            }

            if (cardDto.securityCode.length != 3) {
                console.log("Invalid security code");
            }

            if(!cardDto.cash){
                cardDto.cash = 10000;
            }
            /*const esValida = luhn.validate(cardDto.cardNumber); 
            if(esValida){
                console.log("Not a valid card number");
            }*/

            const saltOrRounds: number = 10;
            const fourDigitCardNumber: string = cardDto.cardNumber.slice(-4);
            cardDto.cardNumber = await bcrypt.hash(cardDto.cardNumber, saltOrRounds);
            cardDto.fourDigitCardNumber = fourDigitCardNumber;
            cardDto.securityCode = await bcrypt.hash(cardDto.securityCode, saltOrRounds);
            cardDto.expirationDate = await bcrypt.hash(cardDto.expirationDate, saltOrRounds);
            cardDto.cardHolderName = await bcrypt.hash(cardDto.cardHolderName, saltOrRounds);

            const insertedCard = await this.cardRepository.addCardForUser(userId, cardDto);
            return insertedCard;

        } catch (error) {
            console.error('Failed to add card: ', error);
            console.log('Failed to add card');
        }
    }



}

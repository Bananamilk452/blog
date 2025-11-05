import { getMainActor } from "../models/actor";

export class ActorService {
  userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  getMainActor() {
    return getMainActor();
  }
}

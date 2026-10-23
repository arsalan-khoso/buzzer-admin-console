import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { API_BASE_URL, apiOrigin } from '../../core/api.config';
import { AuthService } from '../../core/auth/services/auth.service';
import { MATCH_SOCKET_EVENTS } from '../constants/matches.constants';
import { MatchEvent, MatchLiveMessage, MatchScoreboard, MatchStatus } from '../models/match.model';

/**
 * Live updates for one match over Socket.IO (server root, default /socket.io path, JWT as
 * auth.token). Subscribing joins the match room; unsubscribing leaves it and closes the socket,
 * so a page that is left stops receiving updates and coming back starts clean.
 */
@Injectable({ providedIn: 'root' })
export class MatchLiveService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly auth = inject(AuthService);

  watch(matchId: string): Observable<MatchLiveMessage> {
    return new Observable<MatchLiveMessage>((subscriber) => {
      const socket = io(apiOrigin(this.baseUrl), {
        // Read on every (re)connect, so a renewed token is used
        auth: (send) => send({ token: this.auth.accessToken }),
      });

      // (Re)joining on every connect keeps the room after a dropped connection
      socket.on('connect', () => socket.emit(MATCH_SOCKET_EVENTS.join, matchId));

      // An expired token is refused at the handshake; renew it once and connect again
      socket.on('connect_error', () => {
        if (!socket.active && this.auth.isTokenExpired() && this.auth.canRefresh()) {
          this.auth
            .refreshSession()
            .subscribe({ next: () => socket.connect(), error: () => undefined });
        }
      });

      socket.on(MATCH_SOCKET_EVENTS.event, (event: MatchEvent) => {
        if (event.matchId === matchId) {
          subscriber.next({ kind: 'event', event: { ...event, team: null, player: null } });
        }
      });
      socket.on(MATCH_SOCKET_EVENTS.scoreboard, (scoreboard: MatchScoreboard) => {
        if (scoreboard.matchId === matchId) {
          subscriber.next({ kind: 'scoreboard', scoreboard });
        }
      });
      socket.on(MATCH_SOCKET_EVENTS.status, (update: { id: string; status: MatchStatus }) => {
        if (update.id === matchId) {
          subscriber.next({ kind: 'status', status: update.status });
        }
      });

      return () => {
        socket.emit(MATCH_SOCKET_EVENTS.leave, matchId);
        socket.removeAllListeners();
        socket.disconnect();
      };
    });
  }
}

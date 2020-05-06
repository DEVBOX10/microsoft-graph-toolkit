/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.  Licensed under the MIT License.
 * See License in the project root for license information.
 * -------------------------------------------------------------------------------------------
 */

import { customElement, html, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { IDynamicPerson } from '../../graph/types';
import { Providers } from '../../Providers';
import { ProviderState } from '../../providers/IProvider';
import '../../styles/fabric-icon-font';
import { MgtBaseComponent } from '../baseComponent';
import '../mgt-person/mgt-person';
import { MgtFlyout } from '../sub-components/mgt-flyout/mgt-flyout';
import { styles } from './mgt-login-css';

export type LoginButtonType = 'avatar' | 'name' | 'avatarAndName';

/**
 * Web component button and flyout control to facilitate Microsoft identity platform authentication
 *
 * @export
 * @class MgtLogin
 * @extends {MgtBaseComponent}
 *
 * @fires loginInitiated - Fired when login is initiated by the user
 * @fires loginCompleted - Fired when login completes
 * @fires loginFailed - Fired when login fails
 * @fires logoutInitiated - Fired when logout is initiated by the user
 * @fires logoutCompleted - Fired when logout completed
 *
 * @cssprop --font-size - {Length} Login font size
 * @cssprop --font-weight - {Length} Login font weight
 * @cssprop --height - {String} Login height percentage
 * @cssprop --margin - {String} Margin size
 * @cssprop --padding - {String} Padding size
 * @cssprop --color - {Color} Login font color
 * @cssprop --background-color - {Color} Login background color
 * @cssprop --background-color--hover - {Color} Login background hover color
 * @cssprop --popup-content-background-color - {Color} Popup content background color
 * @cssprop --popup-command-font-size - {Length} Popup command font size
 */
@customElement('mgt-login')
export class MgtLogin extends MgtBaseComponent {
  /**
   * Array of styles to apply to the element. The styles should be defined
   * using the `css` tag function.
   */
  static get styles() {
    return styles;
  }

  /**
   * allows developer to use specific user details for login
   * @type {IDynamicPerson}
   */
  @property({
    attribute: 'user-details',
    type: Object
  })
  public userDetails: IDynamicPerson;

  @property({
    attribute: 'button-type'
  })
  public buttonType: LoginButtonType;

  /**
   * Gets the flyout element
   *
   * @protected
   * @type {MgtFlyout}
   * @memberof MgtLogin
   */
  protected get flyout(): MgtFlyout {
    return this.renderRoot.querySelector('.flyout');
  }

  /**
   * determines if login menu popup should be showing
   * @type {boolean}
   */
  @property({ attribute: false }) private _isFlyoutOpen: boolean;

  private _image: string;

  constructor() {
    super();
    this._isFlyoutOpen = false;
    this.buttonType = 'avatarAndName';
  }

  /**
   * Invoked each time the custom element is appended into a document-connected element
   *
   * @memberof MgtLogin
   */
  public connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', e => e.stopPropagation());
  }

  /**
   * Initiate login
   *
   * @returns {Promise<void>}
   * @memberof MgtLogin
   */
  public async login(): Promise<void> {
    if (this.userDetails || !this.fireCustomEvent('loginInitiated')) {
      return;
    }

    const provider = Providers.globalProvider;

    if (provider && provider.login) {
      await provider.login();

      if (provider.state === ProviderState.SignedIn) {
        this.fireCustomEvent('loginCompleted');
      } else {
        this.fireCustomEvent('loginFailed');
      }
    }
  }

  /**
   * Initiate logout
   *
   * @returns {Promise<void>}
   * @memberof MgtLogin
   */
  public async logout(): Promise<void> {
    if (!this.fireCustomEvent('logoutInitiated')) {
      return;
    }

    const provider = Providers.globalProvider;
    if (provider && provider.logout) {
      await provider.logout();
      this.userDetails = null;
      this.hideFlyout();
      this.fireCustomEvent('logoutCompleted');
    }
  }

  /**
   * Invoked on each update to perform rendering tasks. This method must return
   * a lit-html TemplateResult. Setting properties inside this method will *not*
   * trigger the element to update.
   */
  protected render() {
    return html`
      <div class="root">
        <div>
          ${this.renderButton()}
        </div>
        ${this.renderFlyout()}
      </div>
    `;
  }

  /**
   * Load state into the component.
   *
   * @protected
   * @returns
   * @memberof MgtLogin
   */
  protected async loadState() {
    const provider = Providers.globalProvider;
    if (provider && !this.userDetails) {
      if (provider.state === ProviderState.SignedIn) {
        const batch = provider.graph.forComponent(this).createBatch();
        batch.get('me', 'me', ['user.read']);
        batch.get('photo', 'me/photo/$value', ['user.read']);
        const response = await batch.execute();

        this._image = response.photo;
        this.userDetails = response.me;
      } else {
        this.userDetails = null;
      }
    }
  }

  /**
   * Render the button.
   *
   * @protected
   * @memberof MgtLogin
   */
  protected renderButton() {
    const classes = {
      'login-button': true,
      'no-click': this._isFlyoutOpen
    };
    return html`
      <button ?disabled="${this.isLoadingState}" @click=${this.onClick} class=${classMap(classes)} role="button">
        ${this.renderButtonContent()}
      </button>
    `;
  }

  /**
   * Render the details flyout.
   *
   * @protected
   * @memberof MgtLogin
   */
  protected renderFlyout() {
    return html`
      <mgt-flyout
        class="flyout"
        light-dismiss
        @opened=${() => (this._isFlyoutOpen = true)}
        @closed=${() => (this._isFlyoutOpen = false)}
      >
        <div slot="flyout">
          ${this.renderFlyoutContent()}
        </div>
      </mgt-flyout>
    `;
  }

  /**
   * Render the flyout menu content.
   *
   * @protected
   * @returns
   * @memberof MgtLogin
   */
  protected renderFlyoutContent() {
    if (!this.userDetails) {
      return;
    }
    const avatarSize = 'large';

    return html`
      <div class="popup">
        <div class="popup-content">
          <div>
            <mgt-person
              .personDetails=${this.userDetails}
              .personImage=${this._image}
              .avatarSize=${avatarSize}
              show-name
              show-email
            />
          </div>
          <div class="popup-commands">
            <ul>
              <li>
                <button class="popup-command" @click=${this.logout} aria-label="Sign Out">
                  Sign Out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Render the button content.
   *
   * @protected
   * @returns
   * @memberof MgtLogin
   */
  protected renderButtonContent() {
    if (this.userDetails) {
      if (this.buttonType === 'name') {
        return html`
          <span>
            ${this.userDetails.displayName}
          </span>
        `;
      } else {
        const avatarSize = 'small';
        return html`
          <mgt-person
            .personDetails=${this.userDetails}
            .personImage=${this._image}
            .avatarSize=${avatarSize}
            .showName=${this.buttonType === 'avatarAndName'}
          />
        `;
      }
    } else {
      return html`
        <i class="login-icon ms-Icon ms-Icon--Contact"></i>
        <span aria-label="Sign In">
          Sign In
        </span>
      `;
    }
  }

  /**
   * Show the flyout and its content.
   *
   * @protected
   * @memberof MgtLogin
   */
  protected showFlyout(): void {
    const flyout = this.flyout;
    if (flyout) {
      flyout.open();
    }
  }

  /**
   * Dismiss the flyout.
   *
   * @protected
   * @memberof MgtLogin
   */
  protected hideFlyout(): void {
    const flyout = this.flyout;
    if (flyout) {
      flyout.close();
    }
  }

  private onClick() {
    if (this.userDetails) {
      this.showFlyout();
    } else {
      this.login();
    }
  }
}

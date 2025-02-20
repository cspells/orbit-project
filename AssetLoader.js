export class LoadingScreen {
  constructor() {
    this.loadingScreen = document.getElementById("loading-screen");
    this.progressBar = document.querySelector(".progress-fill");
    this.loadingText = document.getElementById("loading-text");
    this.progressText = document.getElementById("progress-text");

    this.totalItems = 4; // 3 textures + 1 model
    this.loadedItems = 0;
    this.onCompleteCallback = null;
  }

  updateProgress() {
    this.loadedItems++;
    const progress = (this.loadedItems / this.totalItems) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.progressText.textContent = `${Math.round(progress)}% Complete`;

    if (this.loadedItems === this.totalItems) {
      this.loadingText.textContent = "Loading Complete!";
      if (this.onCompleteCallback) {
        setTimeout(() => {
          this.hide();
          this.onCompleteCallback();
        }, 500);
      }
    }
  }

  setLoadingText(text) {
    this.loadingText.textContent = text;
  }

  hide() {
    this.loadingScreen.style.display = "none";
  }

  show() {
    this.loadingScreen.style.display = "flex";
  }

  onComplete(callback) {
    this.onCompleteCallback = callback;
  }
}

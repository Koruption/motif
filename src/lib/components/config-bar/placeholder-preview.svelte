<div
  class="mb-4 flex h-70 w-full items-center justify-center overflow-hidden rounded-md border border-white/8 bg-[linear-gradient(180deg,rgba(22,22,22,1),rgba(9,9,9,1))]"
  aria-hidden="true"
>
  <div class="placeholder-stage">
    <div class="placeholder-frame placeholder-frame--outer"></div>
    <div class="placeholder-frame placeholder-frame--middle"></div>
    <div class="placeholder-frame placeholder-frame--inner"></div>
    <div class="placeholder-bar placeholder-bar--horizontal"></div>
    <div class="placeholder-bar placeholder-bar--vertical"></div>
    <div class="placeholder-core"></div>
  </div>
</div>

<style>
  .placeholder-stage {
    position: relative;
    width: 13rem;
    height: 13rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-frame,
  .placeholder-bar,
  .placeholder-core {
    position: absolute;
  }

  .placeholder-frame {
    border: 1px solid rgb(255 255 255 / 0.1);
  }

  .placeholder-frame--outer {
    width: 13rem;
    height: 13rem;
    animation: placeholder-pulse 5.2s ease-in-out infinite;
  }

  .placeholder-frame--middle {
    width: 9.25rem;
    height: 9.25rem;
    border-color: rgb(255 255 255 / 0.14);
    animation: placeholder-pulse 5.2s ease-in-out infinite reverse;
  }

  .placeholder-frame--inner {
    width: 5.2rem;
    height: 5.2rem;
    border-color: rgb(255 255 255 / 0.18);
    animation: placeholder-pulse 4.4s ease-in-out infinite;
  }

  .placeholder-bar {
    background: rgb(255 255 255 / 0.12);
  }

  .placeholder-bar--horizontal {
    width: 13rem;
    height: 1px;
    animation: placeholder-shift-x 4.8s cubic-bezier(0.45, 0, 0.55, 1)
      infinite;
  }

  .placeholder-bar--vertical {
    width: 1px;
    height: 13rem;
    animation: placeholder-shift-y 4.8s cubic-bezier(0.45, 0, 0.55, 1)
      infinite;
  }

  .placeholder-core {
    width: 0.52rem;
    height: 0.52rem;
    background: rgb(255 255 255 / 0.92);
    box-shadow: 0 0 24px rgb(255 255 255 / 0.12);
    animation: placeholder-core 2.8s ease-in-out infinite;
  }

  @keyframes placeholder-pulse {
    0%,
    100% {
      transform: scale(0.98);
      opacity: 0.42;
    }
    50% {
      transform: scale(1.02);
      opacity: 1;
    }
  }

  @keyframes placeholder-shift-x {
    0%,
    100% {
      transform: translateX(-0.6rem);
      opacity: 0.28;
    }
    50% {
      transform: translateX(0.6rem);
      opacity: 0.9;
    }
  }

  @keyframes placeholder-shift-y {
    0%,
    100% {
      transform: translateY(0.6rem);
      opacity: 0.28;
    }
    50% {
      transform: translateY(-0.6rem);
      opacity: 0.9;
    }
  }

  @keyframes placeholder-core {
    0%,
    100% {
      transform: scale(0.92);
      opacity: 0.76;
    }
    50% {
      transform: scale(1.14);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .placeholder-frame--outer,
    .placeholder-frame--middle,
    .placeholder-frame--inner,
    .placeholder-bar--horizontal,
    .placeholder-bar--vertical,
    .placeholder-core {
      animation: none;
    }
  }
</style>
